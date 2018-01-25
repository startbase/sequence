/**

 получает данные вида

*/

var task = {
    'sequence': [
        {'event_key': 'event_name'},
        {'rule': 'any'},
        {'rule': 'time', 'seconds': '10'},
        {'event_key': 'event_name'}
    ],

    'data': [
        {
            'segment': 'segment_name',
            'portage_key': 'portage_key',
            'key': 'key_id',
            'datetime': '2017-12-31 00:00:01',
            'event': 'event_name'
        },
        {
            'segment': 'segment_name',
            'portage_key': 'portage_key',
            'key': 'key_id',
            'datetime': '2017-12-31 00:00:01',
            'event': 'event_name'
        }
    ]
};

/*
    делает просчет и отдает результат
*/