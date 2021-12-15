#!/usr/bin/env bash

# Wraps the docker execution in a nice bow

set -e

# Trace if TRACE_ON is set
[[ $TRACE_ON ]] && set -x

current_dir=$(pwd)
if [[ $DOTENV_PATH ]]; then
    [[ $DOTENV_PATH != /* ]] && DOTENV_PATH=$(cd $current_dir/$(dirname "$DOTENV_PATH") && pwd)
else
    DOTENV_PATH="$current_dir/.env"
fi

# Parse .env file if it exists
# https://gist.github.com/mihow/9c7f559807069a03e302605691f85572#gistcomment-3699759
[[ -f $DOTENV_PATH ]] && {
    echo "Using environment variables from $DOTENV_PATH"
    export $(echo $(cat $DOTENV_PATH | sed 's/#.*//g' | sed 's/\r//g' | xargs))
}

# Trace if TRACE_ON is set
[[ $TRACE_ON ]] && set -x

my_dirname="$(cd $(dirname "$0"); pwd)"
image_name=richb-press
local_dir=$1

# Books use more memory than Docker's default. Check if it is low and inform the user
hyperkit_file="$HOME/Library/Containers/com.docker.docker/Data/vms/0/hyperkit.json"
if [[ -f "$hyperkit_file" ]]
then
    too_small=0

    # If jq is installed then we can use it
    if [[ $(command -v jq) ]]
    then
        memory_size=$(jq .memory < "$hyperkit_file")
        [[ ! $memory_size > 2048 ]] && too_small=1
    else
        # Otherwise, just use a string search and hope that we find it
        [[ $(grep '"memory":2048,' "$hyperkit_file") != '' ]] && too_small=1
    fi

    if [[ $too_small == 1 ]]
    then
        >&2 echo ""
        >&2 echo "===================================================================="
        >&2 echo "WARNING: Docker seems to be configured for a small amount of memory."
        >&2 echo "Consider expanding it by following the instructions here:"
        >&2 echo "  https://docs.docker.com/docker-for-windows/#resources"
        >&2 echo "===================================================================="
        sleep 5
    fi
fi

if [[ $1 == '--help' ]]; then
    echo "Check out the README for this repo to get help on usage!"
    echo 'The args are: {tempdir} {command} {repo_name/book_slug} {recipe} {gitref}'
    exit 0
fi

[[ $local_dir ]] || ( >&2 echo "ERROR: A local temp directory for the book is required as the first argument" && exit 111)
[[ $2 ]] || ( >&2 echo "ERROR: A command is required as the second argument" && exit 111)

[[ $CI_TEST ]] || INTERACTIVE='--interactive'
[[ $CI_TEST ]] || [ -t 0 ] && ENABLE_TTY='--tty' # https://serverfault.com/a/753459

# Ensure the directory is created with the current user so docker can chown its files to be the same user
[[ -d $local_dir ]] || mkdir -p "$local_dir"

$my_dirname/build-dockerfile.sh

[[ $RECIPES_ROOT ]] && {
    [[ $RECIPES_ROOT != /* ]] && RECIPES_ROOT=$(cd $current_dir/$RECIPES_ROOT && pwd)
    opt_mount_recipes="--volume=$RECIPES_ROOT:/workspace/richb-press/recipes/"
}

[[ $SKIP_DOCKER_BUILD ]] || {
    DOCKER_BUILDKIT=1 COMPOSE_DOCKER_CLI_BUILD=1 docker build --tag $image_name --file $my_dirname/Dockerfile $my_dirname/.
}
docker run $INTERACTIVE $ENABLE_TTY \
    --volume=$(cd "$local_dir"/; pwd):/data/ \
    $opt_mount_recipes \
    --env-file $my_dirname/cli.env \
    --env TRACE_ON \
    --env CODE_VERSION \
    --env GH_SECRET_CREDS \
    --env AWS_ACCESS_KEY_ID \
    --env AWS_SECRET_ACCESS_KEY \
    --env AWS_SESSION_TOKEN \
    --env GOOGLE_SERVICE_ACCOUNT_CREDENTIALS \
    --env WEB_QUEUE_STATE_S3_BUCKET \
    --env S3_QUEUE \
    --env GDOC_GOOGLE_FOLDER_ID \
    --env CORGI_ARTIFACTS_S3_BUCKET \
    --env PREVIEW_APP_URL_PREFIX \
    --env ARG_S3_BUCKET_NAME \
    --env START_AT_STEP \
    --env STOP_AT_STEP \
    --env KCOV_DIR \
    --env __CI_KCOV_MERGE_ALL__ \
    --rm $image_name "${@:2}" # Args after the 1st one

if [[ $2 == *pdf ]]
then
    >&2 echo "The PDF is available somewhere in either $local_dir/assembled/collection.pdf or $local_dir/artifacts-single/book.pdf"
fi