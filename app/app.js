/*
    Принимает HTTP запрос и выполняет команды
*/

// Пример HTTP запроса на scheduler
let query = {
    'workers':[
        {'url':'http://127.0.0.1:3001'}
    ],
    'storage': 'segment_name',
    "sequence": [
        {"rule": "equal", "action_key": "view_search"},
        {"rule": "any"},
        {"rule": "equal", "action_key": "view"}
    ]
};

/**
 *

 После обработки и проверки запроса, передаем все в scheduler, который распределяет запрос по воркерам

 scheduler обсчитывает файлы и распределяет нагрузку по воркерам

 после получения ответа от scheduler, app отдает ответ клиенту вида

 *
 *
 */

let response = {
    'sequence_count':10,
    'processed':{
        'files':100,
        'size':100, // kb
        'workers':3,
        'time':2, // seconds
        'errors':0
    },
    'sequence_stat':{
        // подсчет вариаций событий итд, будет в v2
    }
};