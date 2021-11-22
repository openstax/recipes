# LCOV_EXCL_START
exec 2> >(tee $IO_BOOK/stderr >&2)
book="$S3_QUEUE/$CODE_VERSION.web-hosting-queue.json"
if [[ ! -s "$book" ]]; then
    echo "Book is empty"
    exit 1
fi

echo -n "$(cat $book | jq -r '.repo')" >$IO_BOOK/repo
echo -n "$(cat $book | jq -r '.version')" >$IO_BOOK/version

# echo -n "$(cat $book | jq -r '.slug')" >$IO_BOOK/slug
# echo -n "$(cat $book | jq -r '.style')" >$IO_BOOK/style
# echo -n "$(cat $book | jq -r '.uuid')" >$IO_BOOK/uuid
# LCOV_EXCL_STOP