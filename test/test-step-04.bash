#!/bin/bash
set -e
[[ $0 != "-bash" ]] && cd "$(dirname "$0")"
[[ ${TRACE_ON} ]] && set -x

SOCI_DIR=../data/test-soci

SKIP_DOCKER_BUILD=1 \
KCOV_DIR=_kcov04-a \
../cli.sh $SOCI_DIR all-archive-web col11407 sociology latest

SKIP_DOCKER_BUILD=1 \
KCOV_DIR=_kcov04-b \
../cli.sh $SOCI_DIR archive-validate-cnxml
