"""Direct-mode tests for task-bound ratings, dispute access, and final verdicts."""

EVIDENCE = "https://ipfs.io/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"
CHALLENGE = "https://ipfs.io/ipfs/bafybeihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku"
OTHER = "https://dweb.link/ipfs/bafybeihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku"
WEB = r"https://.*ipfs/.*"
BOND = 10**18


def _addr(value):
    if hasattr(value, "as_hex"):
        return value
    try:
        from genlayer.types import Address
    except ImportError:
        from genlayer.py.types import Address
    return Address(value)


def _hex(value) -> str:
    if hasattr(value, "as_hex"):
        return value.as_hex.lower()
    if isinstance(value, (bytes, bytearray)):
        return "0x" + bytes(value).hex()
    return str(value).lower()


def _register(contract, direct_vm, who, name):
    direct_vm.sender = who
    contract.register_agent(name, "https://ipfs.io/ipfs/profile")


def _open(contract, direct_vm, agent, counterparty, task_id, description="Deliver the brief"):
    direct_vm.sender = agent
    contract.open_task(task_id, _addr(counterparty), description)


def _rate(contract, direct_vm, counterparty, task_id, rating, evidence=EVIDENCE):
    direct_vm.sender = counterparty
    contract.accept_task(task_id)
    contract.submit_rating(task_id, rating, evidence)


def _dispute(contract, direct_vm, who, rating_id, evidence=CHALLENGE):
    direct_vm.sender = who
    direct_vm.value = BOND
    contract.file_dispute(rating_id, evidence)
    direct_vm.value = 0


def _score(contract, agent) -> int:
    return int(contract.get_agent(_addr(agent))["score"])


def _rating_value(contract, rating_id) -> int:
    return int(contract.get_rating(rating_id)["rating"])


def test_duplicate_rating_for_same_task_reverts(direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie):
    contract = direct_deploy("contracts/credscore.py")
    _register(contract, direct_vm, direct_alice, "Atlas")
    _open(contract, direct_vm, direct_alice, direct_bob, "task-1", "Market brief")

    direct_vm.sender = direct_charlie
    with direct_vm.expect_revert("Only the task counterparty can accept"):
        contract.accept_task("task-1")

    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("Counterparty must accept the task"):
        contract.submit_rating("task-1", 4, EVIDENCE)

    _rate(contract, direct_vm, direct_bob, "task-1", 4)
    record = contract.get_task("task-1")
    rating = contract.get_rating(1)
    assert int(record["rating_id"]) == 1
    assert record["accepted"] is True
    assert record["description"] == "Market brief"
    assert _hex(record["agent"]) == _hex(direct_alice)
    assert _hex(record["counterparty"]) == _hex(direct_bob)
    assert rating["task_id"] == "task-1"
    assert rating["task"] == "Market brief"
    assert int(rating["original"]) == 4
    assert _hex(rating["author"]) == _hex(direct_bob)
    assert _hex(rating["target"]) == _hex(direct_alice)
    assert _score(contract, direct_alice) == 80

    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("Task already rated"):
        contract.submit_rating("task-1", 1, OTHER)

    assert int(contract.get_rating_count()) == 1
    assert _rating_value(contract, 1) == 4
    assert _score(contract, direct_alice) == 80

    _open(contract, direct_vm, direct_alice, direct_bob, "task-2", "Second brief")
    _rate(contract, direct_vm, direct_bob, "task-2", 2)
    assert int(contract.get_rating_count()) == 2
    assert _score(contract, direct_alice) == 60


def test_cancelled_task_cannot_be_rated(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/credscore.py")
    _register(contract, direct_vm, direct_alice, "Atlas")
    _open(contract, direct_vm, direct_alice, direct_bob, "task-1")
    direct_vm.sender = direct_alice
    contract.cancel_task("task-1")
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("Task was cancelled"):
        contract.accept_task("task-1")
    assert contract.get_task("task-1")["cancelled"] is True


def test_unauthorized_dispute_reverts(direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie):
    contract = direct_deploy("contracts/credscore.py")
    _register(contract, direct_vm, direct_alice, "Atlas")
    _open(contract, direct_vm, direct_alice, direct_bob, "task-1")
    _rate(contract, direct_vm, direct_bob, "task-1", 2)

    direct_vm.sender = direct_charlie
    direct_vm.value = BOND
    with direct_vm.expect_revert("Only the rated agent or counterparty can dispute"):
        contract.file_dispute(1, CHALLENGE)
    direct_vm.value = 0

    stored = contract.get_rating(1)
    assert stored["disputed"] is False
    assert stored["resolved"] is False
    assert _rating_value(contract, 1) == 2

    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("Dispute bond is required"):
        contract.file_dispute(1, CHALLENGE)

    _dispute(contract, direct_vm, direct_alice, 1)
    stored = contract.get_rating(1)
    assert stored["disputed"] is True
    assert int(stored["bond"]) == BOND
    assert _hex(stored["challenger"]) == _hex(direct_alice)


def test_stake_weight_is_consumed_once(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/credscore.py")
    _register(contract, direct_vm, direct_alice, "Atlas")
    _register(contract, direct_vm, direct_bob, "Reviewer")
    direct_vm.sender = direct_bob
    direct_vm.value = BOND
    contract.stake()
    direct_vm.value = 0

    _open(contract, direct_vm, direct_alice, direct_bob, "task-1")
    _rate(contract, direct_vm, direct_bob, "task-1", 5)
    assert int(contract.get_rating(1)["weight"]) == BOND
    assert _score(contract, direct_alice) == 100

    _open(contract, direct_vm, direct_alice, direct_bob, "task-2")
    direct_vm.sender = direct_bob
    contract.accept_task("task-2")
    with direct_vm.expect_revert("Stake weight already used"):
        contract.submit_rating("task-2", 1, EVIDENCE)
    assert int(contract.get_rating_count()) == 1
    assert _score(contract, direct_alice) == 100


def _two_ratings(contract, direct_vm, alice, bob, charlie):
    _register(contract, direct_vm, alice, "Atlas")
    _open(contract, direct_vm, alice, bob, "task-high", "High quality delivery")
    _open(contract, direct_vm, alice, charlie, "task-low", "Low quality delivery")
    _rate(contract, direct_vm, bob, "task-high", 5)
    _rate(contract, direct_vm, charlie, "task-low", 1)
    assert _score(contract, alice) == 60
    low_id = int(contract.get_task("task-low")["rating_id"])
    _dispute(contract, direct_vm, alice, low_id)
    return low_id


def _mock_verdict(direct_vm, verdict: str):
    import genlayer.vm as vm
    from genlayer.types import Lazy

    def _leader_only(leader_fn, validator_fn, /, **kwargs):
        return Lazy(leader_fn)

    vm.run_nondet_default.lazy = _leader_only
    direct_vm.mock_web(WEB, {"status": 200, "body": "Evidence text for the completed task."})
    direct_vm.mock_llm(r".*", verdict)


def test_approved_verdict_is_final_and_matches_score(direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie):
    contract = direct_deploy("contracts/credscore.py")
    low_id = _two_ratings(contract, direct_vm, direct_alice, direct_bob, direct_charlie)
    _mock_verdict(direct_vm, "APPROVE")

    direct_vm.sender = direct_alice
    assert contract.adjudicate_dispute(low_id) is True

    stored = contract.get_rating(low_id)
    assert stored["resolved"] is True
    assert stored["approved"] is True
    assert int(stored["rating"]) == 0
    assert int(stored["original"]) == 1
    assert _score(contract, direct_alice) == 100

    with direct_vm.expect_revert("Dispute already resolved"):
        contract.adjudicate_dispute(low_id)

    stored = contract.get_rating(low_id)
    assert stored["approved"] is True
    assert int(stored["rating"]) == 0
    assert _score(contract, direct_alice) == 100


def test_rejected_verdict_keeps_rating_and_score(direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie):
    contract = direct_deploy("contracts/credscore.py")
    low_id = _two_ratings(contract, direct_vm, direct_alice, direct_bob, direct_charlie)
    _mock_verdict(direct_vm, "REJECT")

    direct_vm.sender = direct_charlie
    assert contract.adjudicate_dispute(low_id) is False

    stored = contract.get_rating(low_id)
    assert stored["resolved"] is True
    assert stored["approved"] is False
    assert int(stored["rating"]) == 1
    assert int(stored["original"]) == 1
    assert _score(contract, direct_alice) == 60

    with direct_vm.expect_revert("Dispute already resolved"):
        contract.adjudicate_dispute(low_id)

    stored = contract.get_rating(low_id)
    assert stored["approved"] is False
    assert int(stored["rating"]) == 1
    assert _score(contract, direct_alice) == 60


def test_invalidated_stake_weight_can_be_used_again(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/credscore.py")
    _register(contract, direct_vm, direct_alice, "Atlas")
    _register(contract, direct_vm, direct_bob, "Reviewer")
    direct_vm.sender = direct_bob
    direct_vm.value = BOND
    contract.stake()
    direct_vm.value = 0
    _open(contract, direct_vm, direct_alice, direct_bob, "task-1")
    _rate(contract, direct_vm, direct_bob, "task-1", 1)
    _dispute(contract, direct_vm, direct_alice, 1)
    _mock_verdict(direct_vm, "APPROVE")
    direct_vm.sender = direct_alice
    assert contract.adjudicate_dispute(1) is True
    assert _score(contract, direct_alice) == 50
    _open(contract, direct_vm, direct_alice, direct_bob, "task-2")
    _rate(contract, direct_vm, direct_bob, "task-2", 5)
    assert int(contract.get_rating(2)["weight"]) == BOND
    assert _score(contract, direct_alice) == 100


def test_inexact_verdict_does_not_resolve(direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie):
    contract = direct_deploy("contracts/credscore.py")
    low_id = _two_ratings(contract, direct_vm, direct_alice, direct_bob, direct_charlie)
    _mock_verdict(direct_vm, "Approved, with notes")

    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("Verdict was not APPROVE or REJECT"):
        contract.adjudicate_dispute(low_id)

    stored = contract.get_rating(low_id)
    assert stored["resolved"] is False
    assert int(stored["rating"]) == 1
    assert _score(contract, direct_alice) == 60
