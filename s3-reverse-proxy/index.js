const express = require('express')
const httpProxy = require('http-proxy')

const app = express()
const PORT = 8000
// https://vercel-clone-outputs-v2.s3.ap-southeast-2.amazonaws.com/__outputs/p1/index.html
const BASE_PATH = 'your Bucket ID'

const proxy = httpProxy.createProxy()

app.use((req, res) => {
    const hostname = req.hostname;
    // a1 || a2 || a3 || other project name
    const subdomain = hostname.split('.')[0];

    const resolvesTo = `${BASE_PATH}/${subdomain}`

    return proxy.web(req, res, { target: resolvesTo, changeOrigin: true })
})

proxy.on('proxyReq', (proxyReq, req, res) => {
    
    const url = req.url;
    if(url === '/') {
        proxyReq.path += 'index.html'
    }
})

app.listen(PORT, () => console.log(`Reverse Proxy Server Running...${PORT}`))