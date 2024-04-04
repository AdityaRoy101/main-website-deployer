const express = require('express')
const { generateSlug } = require('random-word-slugs')
const { ECSClient, RunTaskCommand } = require('@aws-sdk/client-ecs')
const { Server, Socket } = require('socket.io')
const Redis = require('ioredis')

const app = express()
const PORT = 9000

const subscriber = new Redis('your redis arn')

const io = new Server({ cors: '*' })

io.on('connection', socket => {
    socket.on('subscribe', channel => {
        socket.join(channel)
        socket.emit('message', `Joined ${channel}`)
    })
})

io.listen(9002, () => console.log('Socket Server Running... on 9002'))

const ecsClient = new ECSClient({
    region: 'ap-southeast-2', // Region of the bucket.
    credentials: {
        accessKeyId: 'your access ID',
        secretAccessKey: 'your secret Key'
    }
})

const config = {
    CLUSTER: 'your aws cluster arn',
    TASK: 'your aws cluster task arn'
}

app.use(express.json()) // for parsing application/json

app.post('/project', async (req, res) => {
    const { gitURL, slug } = req.body
    const projectSlug = slug ? slug : generateSlug()

    // Spin the Container
    const command = new RunTaskCommand({
        cluster: config.CLUSTER,
        taskDefinition: config.TASK,
        launchType: 'FARGATE',
        count: 1,
        networkConfiguration: {
            awsvpcConfiguration: {
                assignPublicIp: 'ENABLED',
                subnets: ['your subnet-1' , 'your subnet-2' , 'your subnet-3'],
                securityGroups: ['your subnet-security-grp']
            }
        },
        overrides: {
            containerOverrides: [
                {
                    name: 'builder-image-v2',
                    environment: [
                        {
                            name: 'GIT_REPOSITORY__URL',
                            value: gitURL
                        },
                        {
                            name: 'PROJECT_ID',
                            value: projectSlug
                        }
                    ]
                }
            ]
        }
    })

    await ecsClient.send(command);
    return res.json({ status: 'queued', data: { projectSlug, url: `http://${projectSlug}.localhost:8000` } })
})

async function initRedisSubscribe() {
    console.log('Subscribed to Logs...')
    subscriber.psubscribe('logs:*')
    subscriber.on('pmessage', (pattern, channel, message) => {
        io.to(channel).emit('message', message)
    })
}

initRedisSubscribe()

app.listen(PORT, () => console.log(`Api Server Running...${PORT}`))