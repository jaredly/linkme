
const app = require('express')();
const getMyIp = require('my-local-ip');
const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode');
const multer = require('multer');
const mkdirp = require('mkdirp');

const DEST = '/Users/jared/Desktop/Drops'
const port = 4021

mkdirp.sync(DEST)

let links = [];
try {
  links = require('./links.json');
} catch (e) {
  // Didn't exist yet
}

const save = () => {
  fs.writeFileSync('./links.json', JSON.stringify(links, null, 2));
}

const short = text => {
  if (text.length < 100) return text
  return text.slice(0, 50) + '..' + text.slice(-50);
}

const renderFiles = files => {
  return (
    '<form method="POST" enctype="multipart/form-data">' +
    '<input autofocus name="file" type="file">' +
    '<button>Submit</button></form><br/>' +
    files.map(name => {
      return `
        <a href="?remove=${encodeURIComponent(name)}">&times;</a>&nbsp;
        <a target="_blank" href="?download=${encodeURIComponent(name)}">
          ${name}
        </a>
        <br/>
      `;
    }).join('\n')
  )
}

const render = (links, files, qrcode) => {
  return ('<html><meta name="viewport" ' +
    'content="width=device-width, initial-scale=1"><body>Link me ' +
    '<form method="GET"><input autofocus name="link">' +
    '<button>Submit</button></form><br/>' +
    links.map((link) => {
      return `
        <a href="?nolink=${encodeURIComponent(link)}">&times;</a>&nbsp;
        <a target="_blank" href="${link}">${short(link)}</a>
        <br/>
      `;
    }).join('\n') +
    '<br><br><br><a href="/reset">Clear all</a><br/><br/>' +
    renderFiles(files) +
    '<img src="' + qrcode + '"/>' +
    '</body>')
}

const upload = multer({dest: DEST})

const move = (from, to, done) => {
  const rd = fs.createReadStream(from)
  rd.on('error', done)
  const wd = fs.createWriteStream(to)
  wd.on('error', done)
  wd.on('finish', () => {
    fs.unlink(from);
    done()
  });
  rd.pipe(wd);
}

const cachedImages = {}

const getImage = (ip, done) => {
  if (cachedImages[ip]) {
    return done(cachedImages[ip])
  }
  qrcode.toDataURL('http://' + ip + ':' + port, (err, url) => {
    if (err) {
      console.error('failed to make qr code' + ip + ':' + port + ' ' + err.message)
      console.error(err.stack);
      return
    }
    cachedImages[ip] = url
    done(url)
  });
}

const replaceLocal = (link, ip) => {
  return link.replace('//localhost:', '//' + ip + ':')
}

app.get('/', (req, res) => {
  const ip = getMyIp();
  if (req.query.link) {
    links.push(req.query.link);
    save()
    return res.redirect('/')
  }
  if (req.query.nolink) {
    links = links.filter(link => link !== req.query.nolink)
    save()
    return res.redirect('/')
  }
  if (req.query.remove) {
    fs.unlinkSync(path.join(DEST, req.query.remove))
    return res.redirect('/')
  }
  if (req.query.download) {
    res.sendFile(path.join(DEST, req.query.download))
    return
  }
  const files = fs.readdirSync(DEST)
  getImage(ip, url => {
    res.end(
      render(links.map(link => replaceLocal(link, ip)), files, url)
    )
  });
});

app.post('/', upload.single('file'), (req, res) => {
  const dest = path.join(DEST, req.file.originalname);
  move(req.file.path, dest, err => {
    res.redirect('/');
  })
});

app.get('/reset', (req, res) => {
  links = [];
  save();
  res.redirect('/')
});

app.listen(port, () => {
  console.log("Ready on http://localhost:" + port)
})

