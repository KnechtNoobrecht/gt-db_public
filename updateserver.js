const express = require('express')
const app = express()
const crypto = require('crypto')
const port = 8080
const { exec } = require('child_process');
var fs = require('fs');
var bodyParser = require('body-parser');
var util = require('util');
var log_file = fs.createWriteStream(__dirname + '/debug.log', {flags : 'w'});
var log_stdout = process.stdout;


app.use(bodyParser.json());

app.post('/az2vcfyz3vr3duwj2fdn3jbq', (req, res) => {
  try {
    if(req.body.ref == "refs/heads/main") {
      const gitpull = exec('cd /home/gt-db/gt-db/ && git pull', function (err,stdout,stderr) {
        if(err) {
          console.log(err)
        }
        if(stdout) {
          console.log(stdout)
        }
        if(stderr) {
          console.log(stderr)
        }
      })
      gitpull.on('exit', function(exitcode) {
        if(exitcode == 0) {
          const dockerrebuild = exec('docker-compose up --build -d web', function (err,stdout,stderr) {
            if(err) {
              console.log(err)
            }
            if(stdout) {
              console.log(stdout)
            }
            if(stderr) {
              console.log(stderr)
            }
          })
          dockerrebuild.on('exit', function(exitcode) {
            if(exitcode == 0) {
              exec('docker image prune -f')
              console.log('Update successful.')
            } else {
              console.log('"docker-compose up --build -d web" exited with non-zero exit code.');
            }
          })
        } else {
          console.log('"git pull" exited with non-zero exit code.')
        }
      })
    } else {
      date = Date.now();
      date = new Date(date);
      console.log("[" + date.toDateString()+ ', ' + new Date().toTimeString().slice(0, 8) + "]" + ' Got POST request but conditions are not met.')
    }
  } catch (error) {
    console.log(error)
  }
  res.end();
})

//500 error handling
app.use(function(error,req,res,next) {
  console.log(error)
  next()
})

// 404 error handling -> redirecting to login page if someone connects to http page and wants to log in
app.use(function(req, res) {
  console.log(res.statusCode)
  res.status(404).redirect('https://buecherei.gym-trittau.de/')
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`)
})
