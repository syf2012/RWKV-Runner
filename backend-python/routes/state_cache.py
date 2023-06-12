from typing import Any, Dict, List
from utils.log import quick_log
from fastapi import APIRouter, HTTPException, Request, Response, status
from pydantic import BaseModel
import gc
import copy
import sys
import torch

router = APIRouter()

trie = None
dtrie: Dict = {}
max_trie_len = 3000
loop_start_id = 1  # to prevent preloaded prompts from being deleted
loop_del_trie_id = loop_start_id


def init():
    global trie
    try:
        import cyac

        # import mmap
        # import os
        #
        # if os.path.exists("state_cache.trie"):
        #     with open("state_cache.trie", "r") as bf:
        #         buff_object = mmap.mmap(bf.fileno(), 0, access=mmap.ACCESS_READ)
        #     trie = cyac.Trie.from_buff(buff_object, copy=False)
        # else:
        trie = cyac.Trie()
    except ModuleNotFoundError:
        print("cyac not found")


class AddStateBody(BaseModel):
    prompt: str
    tokens: List[str]
    state: Any
    logits: Any


@router.post("/add-state")
def add_state(body: AddStateBody):
    global trie, dtrie, loop_del_trie_id
    if trie is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "trie not loaded")

    if len(trie) >= max_trie_len:
        del_prompt = trie[loop_del_trie_id]
        trie.remove(del_prompt)
        dtrie[loop_del_trie_id] = None
        loop_del_trie_id = loop_del_trie_id + 1
        if loop_del_trie_id >= max_trie_len:
            loop_del_trie_id = loop_start_id

    id = trie.insert(body.prompt)
    device = body.state[0].device
    dtrie[id] = {
        "tokens": copy.deepcopy(body.tokens),
        "state": [tensor.cpu() for tensor in body.state]
        if device != torch.device("cpu")
        else copy.deepcopy(body.state),
        "logits": copy.deepcopy(body.logits),
        "device": device,
    }

    quick_log(
        None,
        None,
        f"New Trie Id: {id}\nTrie Len: {len(trie)}\nTrie Buff Size: {trie.buff_size()}\nDtrie Buff Size Of Id: {_get_a_dtrie_buff_size(dtrie[id])}",
    )

    return "success"


@router.post("/reset-state")
def reset_state():
    global trie, dtrie
    if trie is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "trie not loaded")

    trie = cyac.Trie()
    dtrie = {}
    gc.collect()

    return "success"


class LongestPrefixStateBody(BaseModel):
    prompt: str


def _get_a_dtrie_buff_size(dtrie_v):
    # print(sys.getsizeof(dtrie_v["tokens"][0]))  # str
    # print(sys.getsizeof(dtrie_v["tokens"][0]) * len(dtrie_v["tokens"]))
    # print(dtrie_v["state"][0][0].element_size())
    # print(dtrie_v["state"][0].nelement())
    # print(len(dtrie_v["state"]))
    # print(
    #     len(dtrie_v["state"])
    #     * dtrie_v["state"][0].nelement()
    #     * dtrie_v["state"][0][0].element_size()
    # )
    # print(dtrie_v["logits"][0].element_size())
    # print(dtrie_v["logits"].nelement())
    # print(dtrie_v["logits"][0].element_size() * dtrie_v["logits"].nelement())
    return 54 * len(dtrie_v["tokens"]) + 491520 + 262144 + 28


@router.post("/longest-prefix-state")
def longest_prefix_state(body: LongestPrefixStateBody, request: Request):
    global trie
    if trie is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "trie not loaded")

    id = -1
    for id, len in trie.prefix(body.prompt):
        pass
    if id != -1:
        v = dtrie[id]
        device = v["device"]
        prompt = trie[id]
        quick_log(request, body, "Hit:\n" + prompt)
        return {
            "prompt": prompt,
            "tokens": v["tokens"],
            "state": [tensor.to(device) for tensor in v["state"]]
            if device != torch.device("cpu")
            else v["state"],
            "logits": v["logits"],
            "device": device,
        }
    else:
        return {
            "prompt": "",
            "tokens": [],
            "state": None,
            "logits": None,
            "device": None,
        }


@router.post("/save-state")
def save_state():
    global trie
    if trie is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "trie not loaded")

    # trie.save("state_cache.trie")

    return "not implemented"
