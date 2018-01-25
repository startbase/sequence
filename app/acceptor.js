/**
 *
 Принимает данные в потоке и расскладывает в хранилище
 Пока реализуем приемник на базе HTTP JSON
 вида:
 */

var data = [
    {'segment':'segment_name', 'portage_key':'portage_key', 'key':'key_id', 'datetime':'2017-12-31 00:00:01', 'event':'event_name'},
    {'segment':'segment_name', 'portage_key':'portage_key', 'key':'key_id', 'datetime':'2017-12-31 00:00:01', 'event':'event_name'}
];

/*
 * Складывает в хранилище
 * данные по сегментам
        data/segment/index.seq  - индекс с ключами portage_key => part_XX.seq
        data/segment/part_01.seq
        data/segment/part_02.seq

    Локига хранения

    Каждый файл весит ~50мб, как только файл привысил размер 50Мб, фрагментируем его по ключам (выносим самый популярный ключ в новую партицию)

 */