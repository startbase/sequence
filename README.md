# Sequence

[![Build Status](https://travis-ci.org/startbase/sequence.svg?branch=master)](https://travis-ci.org/startbase/sequence)
[![Coverage Status](https://coveralls.io/repos/github/startbase/sequence/badge.svg?branch=master)](https://coveralls.io/github/startbase/sequence?branch=master)
[![License Type](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE.md)

##Pattern matching for event chains

Funnels let you see exactly where users drop off in a multi-step process. How many people hit your home page and end up converting to paid customers? Which step of your registration flow is causing you to lose users?

## Docker Compose
* Make sure you have a Docker machine up and running;
* Run docker-compose -f docker-compose.yml up.

## Send data

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
```

## Find sequences

```javascript
var request = require("request");

var options = { method: 'POST',
  url: 'http://localhost:3000/query',
  body: 
   { storage: 'december',
     conditions: [
         {
             delimiter:'_', 
             position:0, 
             values:['100']
         },
         {
             delimiter:'_',
             position:2,
             values:['100']// weakSet preferable
         }
     ],
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
```