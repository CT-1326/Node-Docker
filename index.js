const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const cluster = require('cluster');
const os = require('os');
const uuid = require('uuid');
const instance_id = uuid.v4();

const cpuCount = os.cpus().length;
const workerCount = cpuCount / 2;

if (cluster.isMaster) {
    console.log('서버 ID : ' + instance_id);
    console.log('서버 CPU 수 : ' + cpuCount);
    console.log('생성할 워커 수 : ' + workerCount);
    console.log(workerCount + '개의 워커가 생성!\n');

    let workerMsgListener = function (msg) {
        let worker_id = msg.worker_id;

        if (msg.cmd == 'MASTER_ID') {
            cluster.workers[worker_id].send({ cmd: 'MASTER_ID', master_id: instance_id });
        }
    }

    for (let index = 0; index < workerCount; index++) {
        console.log('워커 생성 [' + (index + 1) + '/' + workerCount + ']');

        let worker = cluster.fork();
        worker.on('message', workerMsgListener);
    }

    cluster.on('online', function (worker) {
        console.log('워커 온라인 - 워커 ID : [' + worker.process.pid + ']');
    });

    cluster.on('exit', function (worker) {
        console.log('워커 사망 - 사망한 워커 ID : [' + worker.process.pid + ']');
        console.log('다른 워커를 생성합니다.');

        worker = cluster.fork();
        worker.on('message', workerMsgListener);
    });
} else if (cluster.isWorker) {
    let worker_id = cluster.worker.id;
    let master_id;

    app.listen(port, () => {
        console.log(`Example app listening at http://localhost:${port}`);
    });

    process.send({ worker_id: worker_id, cmd: 'MASTER_ID' });
    process.on("message", function (msg) {
        if (msg.cmd == 'MASTER_ID') {
            master_id = msg.master_id;
        }
    });

    app.get("/", (req, res) => {
        res.send("안녕하세요~! 저는<br>[" + master_id + ']서버의<br>워커 [' + cluster.worker.id + '] 입니다.');
    });

    app.get('/workerKiller', (req, res) => {
        cluster.worker.kill();
        res.send('워커킬러 호출!');
    });
}