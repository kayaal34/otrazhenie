// Координаты ул. Ленинградская, Камышлов (уровень улицы, геокодировано через
// OpenStreetMap Nominatim) — используются для метки на карте, чтобы точка
// была видна сразу при загрузке, без клика по лупе поиска.
const MAP_LON = 62.710971
const MAP_LAT = 56.839227

export const CONTACT_INFO = {
  city: 'Камышлов',
  addressLine: 'ул. Ленинградская 27Б, 2 этаж',
  fullAddress: 'Камышлов, ул. Ленинградская 27Б, 2 этаж',
  instagramUrl: 'https://www.instagram.com/otrazhenie.k',
  vkUrl: 'https://vk.ru/club240229713',
  mapEmbedUrl:
    `https://yandex.ru/map-widget/v1/?ll=${MAP_LON}%2C${MAP_LAT}&z=16` +
    `&pt=${MAP_LON},${MAP_LAT},pm2rdm`,
}
