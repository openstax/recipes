# Instructions

This uses a little wrapper to hide all the docker commands

```sh
# All-in-one
#
#  CLI   tempdir   command col_id   recipe_name 
./cli.sh fizix     all-pdf col12006 college-physics
./cli.sh socio     all-pdf col11407 sociology

# All-in-one Git-based books
GH_SECRET_CREDS='..' ./cli.sh 'foo-tempdir' all-git-web 'osbooks-test-bundle' 'test-slug'


# Common steps
./cli.sh fizix fetch col12006
./cli.sh fizix assemble
./cli.sh fizix link-extras
./cli.sh fizix bake college-physics # The recipe name

# PDF steps
./cli.sh fizix mathify
./cli.sh fizix pdf

# Webhosting steps
./cli.sh fizix assemble-metadata
./cli.sh fizix bake-metadata
./cli.sh fizix checksum
./cli.sh fizix disassemble
./cli.sh fizix patch-disassembled-links
./cli.sh fizix jsonify
./cli.sh fizix validate-xhtml
```

In general, the format is:

```sh
TEMP_NAME=physics
# COL_ID=col12006
# RECIPE=college-physics

docker run -it -v $(pwd)/data/${TEMP_NAME}/:/data/ --rm my_image ${command} ${command_specific_args}
```

With the above command, docker will use the `$(pwd)/data/${TEMP_NAME}/` directory to read/write files during each step.