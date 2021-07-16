import * as fs from 'fs'
import * as path from 'path'
import { Step } from './step-definitions'

const buildLogRetentionDays = 14
const genericErrorMessage = 'Error occurred in Concourse. See logs for details.'
const genericAbortMessage = 'Job was aborted.'
const s3UploadFailMessage = 'Error occurred upload to S3.'

export enum JobType {
    PDF = 1,
    DIST_PREVIEW = 2,
    GIT_PDF = 3,
    GIT_DIST_PREVIEW = 4
}
export enum Status {
    QUEUED = 1,
    ASSIGNED = 2,
    PROCESSING = 3,
    FAILED = 4,
    SUCCEEDED = 5,
    ABORTED = 6
}


// A Boolean value denotes that the value will be looked up from this scripts' environment and `true` indicates that it is required
export type Env = { [key: string]: string | boolean }
export type DockerDetails = {
    repository: string
    tag: string
    username?: string
    password?: string
    corgiApiUrl?: string
}

type TaskArgs = {
    resource: string
    processingStates: Status[]
    completedStates: Status[]
    abortedStates: Status[]
}

export type Pipeline = any
export type ConcourseTask = {
    task: string
    config: {
        platform: 'linux'
        image_resource: {
            type: 'docker-image'
            source: {
                insecure_registries?: string[]
                
                repository: string
                tag: string
                username?: string
                password?: string
            }
        },
        params: Env
        run: { path: string,
            args: string[]}
        inputs: Array<{name: string}>
        outputs: Array<{name: string}>
    }
} | {
    get: string
    trigger: boolean
    version: 'every'
}

export enum RESOURCES {
    S3_QUEUE = 's3-queue',
    TICKER = 'ticker',
    OUTPUT_PRODUCER_GIT_PDF = 'output-producer-git-pdf',
    OUTPUT_PRODUCER_ARCHIVE_PDF = 'output-producer-pdf',
    OUTPUT_PRODUCER_GIT_WEB = 'output-producer-git-dist-preview',
    OUTPUT_PRODUCER_ARCHIVE_WEB = 'output-producer-dist-preview',
}
// Note: toConcourseTask converts these into IO_BOOK-style environment variables for the tasks to use
// so that the scripts do not have to hardcode these directories into the script file
export enum IO {
    BOOK = 'book',
    COMMON_LOG = 'common-log',
    ARTIFACTS_SINGLE = 'artifacts-single',
    PREVIEW_URLS = 'preview-urls',
    // Archive directories
    ARCHIVE_FETCHED = 'archive-fetched',
    ARCHIVE_BOOK = 'archive-book',
    ARCHIVE_JSONIFIED = 'archive-jsonified',
    ARCHIVE_UPLOAD = 'archive-upload',
    ARCHIVE_GDOCIFIED = 'archive-gdocified',
    ARCHIVE_DOCX = 'archive-docx',

    // Git directories
    FETCHED = 'fetched', // 'fetched-book-group'
    FETCH_META = 'fetch-meta',
    RESOURCES = 'resources',
    UNUSED_RESOURCES = 'unused-resources',
    ASSEMBLED = 'assembled', // 'assembled-book-group',
    ASSEMBLE_META = 'assemble-meta', // 'assembled-metadata-group',
    BAKED = 'baked', // 'baked-book-group',
    BAKE_META = 'bake-meta', // 'baked-metadata-group',
    LINKED = 'linked', // 'linked-single',
    MATHIFIED = 'mathified', // 'mathified-single',
    DISASSEMBLED = 'disassembled', // 'disassembled-single',
    ARTIFACTS = 'artifacts', // 'artifacts-single',
    DISASSEMBLE_LINKED = 'disassemble-linked', // 'disassembled-linked-single',
    JSONIFIED = 'jsonified', // 'jsonified-single',

}

export type TaskNode = {
    inputs: IO[]
    outputs: IO[]
    staticEnv: Env
    dynamicEnvKeys: string[]
    name: string
    code: string
}

export const expect = <T>(v: T | null | undefined, message: string = 'BUG/ERROR: This value is expected to exist'): T => {
    /* istanbul ignore if */
    if (v == null) {
        throw new Error(message)
    }
    return v
}
const bashy = (cmd: string) => ({
    path: '/bin/bash',
    args: ['-cxe', cmd]
})
export const populateEnv = (env: KeyValue, envKeys: Env) => {
    const ret: any = {}
    for (const key in envKeys) {
        const value = envKeys[key]
        if (value === true) {
            ret[key] = expect(env[key], `Expected environment variable '${key}' to be set but it was not.`)
        } else 
        /* istanbul ignore else */
        if (value === false) {
            ret[key] = env[key]
        } else if(typeof value === 'string') {
            ret[key] = value
        } else {
            throw new Error('BUG: Unsupported type')
        }
    }
    return ret
}
const toUpperCamel = (s: string) => s.toUpperCase().replace(/-/g, '_')
const ioToEnvVars = (inputs: string[], outputs: string[]) => {
    const ret = {}
    inputs.forEach(s => ret[`IO_${toUpperCamel(s)}`] = s)
    outputs.forEach(s => ret[`IO_${toUpperCamel(s)}`] = s)
    return ret
}
function toDockerTag(codeVersion: string) {
    return codeVersion.startsWith(RANDOM_DEV_CODEVERSION_PREFIX) ? 'main' : codeVersion
}
export function toDockerSourceSection(env: KeyValue) {
    /* istanbul ignore next */
    return {
        insecure_registries: env.DOCKER_REGISTRY_HOST ? [env.DOCKER_REGISTRY_HOST] : undefined,
        repository: env.DOCKER_REGISTRY_HOST ? `${env.DOCKER_REGISTRY_HOST}/${expect(env.DOCKER_REPOSITORY)}` : expect(env.DOCKER_REPOSITORY),
        tag: toDockerTag(expect(env.CODE_VERSION)),
        username: env.DOCKERHUB_USERNAME,
        password: env.DOCKERHUB_PASSWORD
    }
}
export const toConcourseTask = (env: KeyValue, taskName: string, inputs: string[], outputs: string[], envNames: Env, cmd: string): ConcourseTask => ({
    task: taskName,
    config: {
        platform: 'linux',
        image_resource: {
            type: 'docker-image',
            source: toDockerSourceSection(env)
        },
        params: {...ioToEnvVars(inputs, outputs), ...populateEnv(env, envNames)},
        run: bashy(cmd),
        inputs: inputs.map(name => ({ name })),
        outputs: outputs.map(name => ({ name })),
    }
})
export const readScript = (pathToFile: string) => `${fs.readFileSync(path.resolve(__dirname, pathToFile), { encoding: 'utf-8' })}\n# Source: ${pathToFile}`

export const reportToOutputProducer = (resource: RESOURCES) => {
    return (status: number, extras?: any) => {
        return {
            put: resource,
            params: {
                id: `${resource}/id`,
                status_id: status,
                ...extras
            }
        }
    }
}

const taskStatusCheck = (env: KeyValue, taskArgs: TaskArgs) => {
    const { resource, processingStates, completedStates, abortedStates } = taskArgs

    const toBashCaseMatch = (list: Status[]) => {
        return `@(${list.join('|')})`
    }

    const myEnv = {
        RESOURCE: expect(resource),
        CORGI_API_URL: true,
        PROCESSING_STATES: toBashCaseMatch(processingStates),
        COMPLETED_STATES: toBashCaseMatch(completedStates),
        ABORTED_STATES: toBashCaseMatch(abortedStates)
    }
    return toConcourseTask(env, 'status-check', [resource], [IO.COMMON_LOG], myEnv, readScript('script/task_status_check.sh'))
}

const runWithStatusCheck = (env: KeyValue, resource: RESOURCES, step: Pipeline) => {
    const reporter = reportToOutputProducer(resource)
    const steps = [step]
    if (!env.SKIP_TORPEDO_TASK) {
        steps.push({
            do: [
                taskStatusCheck(env, {
                    resource: resource,
                    processingStates: [Status.ASSIGNED, Status.PROCESSING],
                    completedStates: [Status.FAILED, Status.SUCCEEDED],
                    abortedStates: [Status.ABORTED]
                })
            ],
            on_failure: reporter(Status.ABORTED, {
                error_message: genericAbortMessage
            })
        })
    }
    return {
        in_parallel: {
            fail_fast: true,
            steps
        }
    }
}

export const wrapGenericCorgiJob = (env: KeyValue, jobName: string, resource: RESOURCES, step: Pipeline, extraArgs?: any) => {
    const report = reportToOutputProducer(resource)
    return {
        name: jobName,
        build_log_retention: {
            days: buildLogRetentionDays
        },
        plan: [
            {
                do: [
                    { get: resource, trigger: true, version: 'every' }
                ],
                on_failure: report(Status.FAILED, {
                    error_message: genericErrorMessage
                })
            },
            runWithStatusCheck(env, resource, step)
        ],
        on_error: report(Status.FAILED, {
            error_message: genericErrorMessage
        }),
        on_abort: report(Status.ABORTED, {
            error_message: genericAbortMessage
        }),
        ...extraArgs
    }
}


export enum PDF_OR_WEB {
    PDF = 'pdf',
    WEB = 'web'
}

  export const taskMaker = (env: KeyValue, pdfOrWeb: PDF_OR_WEB, step: Step) => toConcourseTask(env, `task=${step.name} ${pdfOrWeb}`, step.inputs, [...step.outputs, IO.COMMON_LOG], { TASK_NAME: step.name, CODE_VERSION: true, ...step.env }, readScript('script/run_task.bash'))
  

type Settings = { 
    queueBucket: string,
    artifactsBucket: string,
    codeVersion: string,
    cloudfrontUrl: string,
    isDev: boolean
}

const rand = (len: number) => Math.random().toString().substr(2, len)
export const randId = rand(7)
export const RANDOM_DEV_CODEVERSION_PREFIX = 'random-dev-codeversion'

function defaultEnv(env: KeyValue, key: string, optional?: boolean) {
    const v = process.env[key] || env[key]
    /* istanbul ignore if */
    if (!v && !optional) {
        throw new Error(`ERROR: Missing environment variable: ${key}`)
    }
    env[key] = v
}
export function loadEnv(pathToJson: string) {
    const env: KeyValue = require(pathToJson)
    if (!env.AWS_ACCESS_KEY_ID) {
        // Don't pull the session token from environment if we are loading AWS 
        // keys from the JSON file (anything but local)
        defaultEnv(env, 'AWS_SESSION_TOKEN', true)
    }
    // Prefer environment vars over the JSON files
    for (const key of Object.keys(env)) {
        if (process.env[key]) {
            env[key] = process.env[key]
        }
    }
    defaultEnv(env, 'CODE_VERSION')
    defaultEnv(env, 'AWS_ACCESS_KEY_ID')
    defaultEnv(env, 'AWS_SECRET_ACCESS_KEY')
    defaultEnv(env, 'DOCKER_REPOSITORY', true)
    defaultEnv(env, 'DOCKER_REGISTRY_HOST', true)
    defaultEnv(env, 'DOCKERHUB_USERNAME', true)
    defaultEnv(env, 'DOCKERHUB_PASSWORD', true)
    defaultEnv(env, 'GDOC_GOOGLE_FOLDER_ID', true)
    defaultEnv(env, 'GOOGLE_SERVICE_ACCOUNT_CREDENTIALS', true)

    env.REX_PREVIEW_URL = 'https://rex-web.herokuapp.com'
    env.REX_PROD_PREVIEW_URL = 'https://rex-web-production.herokuapp.com'

    return env
}

export function stepsToTasks(env: KeyValue, pdfOrWeb: PDF_OR_WEB, steps: Step[]): ConcourseTask[] {
    return steps.map(step => taskMaker(env, pdfOrWeb, step))
}

export type KeyValue = {
    CODE_VERSION: string

    DOCKER_REPOSITORY: string
    DOCKER_REGISTRY_HOST: string
    CORGI_API_URL: string
    CORGI_CLOUDFRONT_URL: string
    CORGI_ARTIFACTS_S3_BUCKET: string

    MAX_INFLIGHT_JOBS: number
    WEB_QUEUE_STATE_S3_BUCKET: string

    PIPELINE_TICK_INTERVAL: string // '12h'
    REX_PROD_PREVIEW_URL: string
    REX_PREVIEW_URL: string

    // Used just for the local concourse file. Used for skipping the the torpedo-task
    // that stops the job when the user cancels or the job is complete
    SKIP_TORPEDO_TASK: string

    // Secrets
    DOCKERHUB_USERNAME: string
    DOCKERHUB_PASSWORD: string
    AWS_ACCESS_KEY_ID: string
    AWS_SECRET_ACCESS_KEY: string
    AWS_SESSION_TOKEN?: string
}