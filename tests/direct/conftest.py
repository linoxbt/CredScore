"""Bridge direct-mode cheatcodes onto the contract's genlayer.message API."""

import io
import os
import sys
import tempfile

from gltest.direct import loader, wasi_mock
from gltest.direct import sdk_loader
from gltest.direct.vm import VMContext

_RUNNER_HASH = "5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng"
_COMPAT_RUNNER = """{
  "Seq": [
    {"Depends": "py-lib-genlayer-std:10pqy9vk4a8w8pg25py83s23k3mjjy7dwpdqjvqggb9ms7ycipvh"}
  ]
}
"""


def _ensure_runner_alias(version: str) -> None:
    """The published rc7 bundle does not contain the current runner hash.

    Point that hash at the rc7 standard library with the same contract API
    when no extracted runner is already present.
    """
    dest = sdk_loader.CACHE_DIR / "extracted" / version / "py-genlayer" / _RUNNER_HASH
    runner = dest / "runner.json"
    if runner.exists():
        return
    dest.mkdir(parents=True, exist_ok=True)
    runner.write_text(_COMPAT_RUNNER)


_orig_setup = sdk_loader.setup_sdk_paths


def _setup_sdk_paths(contract_path=None, version=None):
    if version is None:
        cached = sdk_loader.list_cached_versions()
        version = cached[0] if cached else "v0.3.0-rc7"
    _ensure_runner_alias(version)
    return _orig_setup(contract_path, version)


sdk_loader.setup_sdk_paths = _setup_sdk_paths

_orig_inject = loader._inject_message_to_fd0
_orig_refresh = VMContext._refresh_gl_message


def _as_address(value, address_type):
    if isinstance(value, address_type):
        return value
    if isinstance(value, bytes):
        return address_type(value)
    if hasattr(value, "as_bytes"):
        return address_type(value.as_bytes)
    return address_type(value)


def _inject_message_to_fd0(vm):
    try:
        from genlayer.py import calldata  # noqa: F401
    except ImportError:
        pass
    else:
        return _orig_inject(vm)

    import genlayer.calldata as calldata
    from genlayer.types import Address

    sender = _as_address(vm.sender, Address)
    message_data = {
        "contract_address": _as_address(vm._contract_address, Address),
        "sender_address": sender,
        "origin_address": _as_address(vm.origin or vm.sender, Address),
        "stack": [],
        "value": int(vm._value),
        "datetime": vm._datetime,
        "is_init": False,
        "chain_id": int(vm._chain_id),
        "entry_kind": 0,
        "entry_data": b"",
        "entry_stage_data": None,
    }
    encoded = calldata.encode(message_data)
    fd, path = tempfile.mkstemp()
    try:
        os.write(fd, encoded)
        os.lseek(fd, 0, os.SEEK_SET)
        vm._original_stdin_fd = os.dup(0)
        os.dup2(fd, 0)
    finally:
        os.close(fd)
        os.unlink(path)


def _refresh_gl_message(self):
    _orig_refresh(self)
    mod = sys.modules.get("genlayer.message")
    if mod is None:
        return
    from genlayer.types import Address, u256

    sender = _as_address(self.sender, Address)
    mod.sender_address = sender
    mod.value = u256(int(self._value))
    raw = getattr(mod, "raw", None)
    if isinstance(raw, dict):
        raw["sender_address"] = sender
        raw["value"] = mod.value


_orig_allocate = loader._allocate_contract


def _allocate_contract(contract_cls, vm, *args, **kwargs):
    try:
        from genlayer.py.storage import Root  # noqa: F401
    except ImportError:
        import genlayer.storage as storage

        return storage.inmem_allocate(contract_cls, *args, **kwargs)
    return _orig_allocate(contract_cls, vm, *args, **kwargs)


def _sdk_calldata():
    try:
        from genlayer.py import calldata
    except ImportError:
        import genlayer.calldata as calldata
    return calldata


def _gl_call(data: bytes, /) -> int:
    vm = wasi_mock.get_vm()
    fd_buffers = getattr(wasi_mock._local, "fd_buffers", {})
    try:
        request = _sdk_calldata().decode(data)
    except Exception as exc:
        vm._trace(f"gl_call decode error: {exc}")
        return 2**32 - 1

    if getattr(vm, "_in_nondet", False) and isinstance(request, dict):
        for op in wasi_mock._CROSS_CONTRACT_OPS:
            if op in request:
                raise RuntimeError(f"Cross-contract call ({op}) is forbidden inside nondet")

    response = wasi_mock._handle_gl_call(vm, request)
    if response is None:
        return 2**32 - 1
    if isinstance(response, bytes):
        encoded = response
    else:
        try:
            encoded = _sdk_calldata().encode(response)
        except Exception as exc:
            vm._trace(f"gl_call encode error: {exc}")
            return 2**32 - 1

    fd_counter = getattr(wasi_mock._local, "fd_counter", 100)
    fd = fd_counter
    wasi_mock._local.fd_counter = fd_counter + 1
    fd_buffers[fd] = io.BytesIO(encoded)
    wasi_mock._local.fd_buffers = fd_buffers
    return fd


loader._inject_message_to_fd0 = _inject_message_to_fd0
loader._allocate_contract = _allocate_contract
VMContext._refresh_gl_message = _refresh_gl_message
wasi_mock.gl_call = _gl_call
