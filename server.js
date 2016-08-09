
const app = require('express')();
const ip = require('my-local-ip')();
const fs = require('fs');
const qrcode = require('qrcode');

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

const render = (links, qrcode) => {
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
    '<br><br><br><a href="/reset">Clear all</a>' +
    '<img src="' + qrcode + '"/>' +
    '</body>')
}

qrcode.toDataURL('http://' + ip + ':4021', (err, url) => {
  app.get('/', (req, res) => {
    if (req.query.link) {
      links.push(req.query.link.replace('//localhost:', '//' + ip + ':'));
      save()
      return res.redirect('/')
    }
    if (req.query.nolink) {
      links = links.filter(link => link !== req.query.nolink)
      save()
      return res.redirect('/')
    }
    res.end(
      render(links, url)
    )
  });

  app.get('/reset', (req, res) => {
    links = [];
    save();
    res.redirect('/')
  });

  app.listen(4021, () => {
    console.log("Ready on http://localhost:4021")
  })
})

