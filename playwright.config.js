import { defineConfig } from '@playwright/test';
export default defineConfig({
 testDir: './tests/browser', timeout: 30000, workers: 1,
 use: { baseURL: 'http://127.0.0.1:3107', channel: 'msedge', headless: true, trace: 'retain-on-failure' },
 projects: [{name:'desktop',use:{viewport:{width:1280,height:900}}},{name:'phone',use:{viewport:{width:390,height:844},isMobile:true,hasTouch:true}},{name:'tablet',use:{viewport:{width:820,height:1180},isMobile:true,hasTouch:true}}],
 webServer:{command:'node tests/browser-server.js',url:'http://127.0.0.1:3107',reuseExistingServer:false},
});
