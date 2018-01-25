/*

    Принимает HTTP запрос и выполняет команды

    Запросы приходят в Raw JSON вида

 */

var query = {
    'segment': 'segment_name',
    'sequence': [
        {'event_key':'event_name'},
        {'rule':'any'},
        {'rule':'time', 'seconds':'10'},
        {'event_key':'event_name'}
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

var response = {
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