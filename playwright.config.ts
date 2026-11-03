import {defineConfig} from '@playwright/test'
import {existsSync} from 'node:fs'
export default defineConfig({testDir:'./browser-tests',use:{baseURL:'http://127.0.0.1:5173',launchOptions:{executablePath:existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined,args:['--no-sandbox']}},webServer:{command:'npm run dev -- --host 127.0.0.1',url:'http://127.0.0.1:5173',reuseExistingServer:true},reporter:'list'})
