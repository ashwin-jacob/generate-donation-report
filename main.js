const electron = require('electron')
// Module to control application life.
const app = electron.app
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow
//Module for ipcmain
const ipc = require('electron').ipcMain;

//keep track of dulicated
global.duplicateList = [];
global.giverMap = {};

//keep track of report values
global.reportMap = {};
global.headers = [];
global.indvNumbers = [];

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({width: 800, height: 600})

  // and load the index.html of the app.
  mainWindow.loadURL(`file://${__dirname}/index.html`)

  // Open the DevTools.
  mainWindow.webContents.openDevTools()

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

//Get a message from render for multiple people(same first and last name)
ipc.on('list-people', function (event, arg) {
  duplicateList.push(arg);
});

//New account received add it to the last map
ipc.on('account-type', function (event, arg) {
  var giver = giverMap[duplicateList.length-1];
  if(typeof(giver) === "undefined") {
    //Undefined so need to create a new one
    giver = [arg];
  }
  else {
    giver.push(arg);
  }
  giverMap[duplicateList.length-1] = giver;
});

//Got a message to render a new page
ipc.on('finished-report', function (event,arg) {
  reportMap = arg[0];
  headers = arg[1];
  indvNumbers = arg[2];
  if(arg[3] == true) mainWindow.loadURL(`file://${__dirname}/table-render.html`); 
  else mainWindow.loadURL(`file://${__dirname}/finalize.html`);
});