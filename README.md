#Sequence

[![Build Status](https://travis-ci.org/startbase/sequence.svg?branch=master)](https://travis-ci.org/startbase/sequence)
[![Coverage Status](https://coveralls.io/repos/github/startbase/sequence/badge.svg?branch=master)](https://coveralls.io/github/startbase/sequence?branch=master)

Pattern matching for event chains.


<h1>Docker Compose</h1>
<ol type="1">
<li>Make sure you have a Docker machine up and running.</li>
<li>Run docker-compose -f docker-compose.yml up</li>
</ol>

<h1>Send data</h1>
```javascript
var request = require("request");

var options = { method: 'POST',
  url: 'http://localhost:3001/insert',
  body: 
   { data: 
      [ { storage: 'december',
          partition: '1',
          key: '100_3',
          datetime: '2017-12-31 00:00:02',
          action: 'view' } ] },
  json: true };

request(options, function (error, response, body) {
  if (error) throw new Error(error);

  console.log(body);
});


<h1>Find sequences</h1>
```javascript
var request = require("request");

var options = { method: 'POST',
  url: 'http://localhost:3000/query',
  body: 
   { storage: 'december',
     keys: [ '100_' ],
     sequence: 
      [ { rule: 'any' },
        { rule: 'equal',
          action_key: 'view_search',
          date_start: '2017-12-25 00:00:00',
          date_end: '2017-12-31 23:59:59' },
        { rule: 'any' },
        { rule: 'equal',
          action_key: 'view',
          previuos_action_time: '3600' },
        { rule: 'any' },
        { rule: 'equal', action_key: 'participate' } ] },
  json: true };

request(options, function (error, response, body) {
  if (error) throw new Error(error);

  console.log(body);
});