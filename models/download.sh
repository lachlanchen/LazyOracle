#!/usr/bin/env bash
cd /home/lachlan/ProjectsLFS/LazyOracle
set -x
hf download Qwen/Qwen3-4B-GGUF --include "*Q4_K_M*" "*Q5_K_M*" --local-dir models/Qwen3-4B-GGUF
hf download Qwen/Qwen3-1.7B-GGUF --include "*Q4_K_M*" --local-dir models/Qwen3-1.7B-GGUF
hf download tellang/yeji-meta --repo-type dataset --local-dir data/raw/yeji-meta
hf download tellang/yeji-iching --repo-type dataset --local-dir data/raw/yeji-iching
hf download jakeveo05/divination-combined --repo-type dataset --local-dir data/raw/divination-combined
hf download jakeveo05/tcm-divination-training --repo-type dataset --local-dir data/raw/tcm-divination-training
hf download tellang/yeji-4b-instruct-v9 --local-dir models/yeji-4b-instruct-v9
echo ALL_DOWNLOADS_DONE
