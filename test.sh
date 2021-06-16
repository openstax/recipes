[[ -d ./data/test-book/ ]] && rm -rf ./data/test-book/

CI=true                               ./cli.sh ./data/test-book/ all-git-pdf 'philschatz/tiny-book/book-slug1' chemistry main
CI=true START_AT_STEP=git-disassemble ./cli.sh ./data/test-book/ all-git-web 'philschatz/tiny-book/book-slug1' chemistry main

# Move coverage data out of the mounted volume the container used
[[ -d ./coverage/ ]] || mkdir ./coverage/
mv ./data/test-book/_kcov-coverage-results/* ./coverage/

# bash <(curl -s https://codecov.io/bash) -s ./coverage/