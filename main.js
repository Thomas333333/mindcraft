import { AgentProcess } from './src/process/agent_process.js';
import settings from './settings.js';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { createMindServer } from './src/server/mind_server.js';
import { mainProxy } from './src/process/main_proxy.js';
import { readFileSync } from 'fs';

function parseArguments() {
    return yargs(hideBin(process.argv))
        .option('profiles', {
            type: 'array',
            describe: 'List of agent profile paths',
        })
        .option('task_path', {
            type: 'string',
            describe: 'Path to task file to execute'
        })
        .option('task_id', {
            type: 'string',
            describe: 'Task ID to execute'
        })
        .help()
        .alias('help', 'h')
        .parse();
}

function getProfiles(args) {
    return args.profiles || settings.profiles;
}

async function main() {
    if (settings.host_mindserver) {//true
        const mindServer = createMindServer();
    }
    mainProxy.connect();

    const args = parseArguments();
    // Parsed arguments: { _: [], '$0': 'main.js' }
    const profiles = getProfiles(args);//setting.js里的profiles
    console.log(profiles);
    const { load_memory, init_message } = settings; //false "Respond with hello world and your name"

    for (let i=0; i<profiles.length; i++) {//逐一启动每个profile
        const agent_process = new AgentProcess();
        const profile = readFileSync(profiles[i], 'utf8');
        const agent_json = JSON.parse(profile); //"name": "andy", "model": "qwen-plus"
        mainProxy.registerAgent(agent_json.name, agent_process);
        agent_process.start(profiles[i], load_memory, init_message, i, args.task_path, args.task_id);
        await new Promise(resolve => setTimeout(resolve, 1000));//延迟 1 秒，以防止代理进程之间发生冲突。
    }
}

try {
    main();
} catch (error) {
    console.error('An error occurred:', error);
    process.exit(1);
}