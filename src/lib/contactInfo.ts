// Координаты самого дома Ленинградская 27Б (геокодер Яндекс.Карт по точному
// номеру дома). Раньше здесь была точка уровня улицы из OSM — она стояла
// примерно в 300 м от здания, и метка показывала не тот дом.
const MAP_LON = 62.713869
const MAP_LAT = 56.841684
const MAP_QUERY = 'Камышлов, улица Ленинградская, 27Б'

export const CONTACT_INFO = {
  city: 'Камышлов',
  addressLine: 'ул. Ленинградская 27Б, 2 этаж',
  fullAddress: 'Камышлов, ул. Ленинградская 27Б, 2 этаж',
  instagramUrl: 'https://www.instagram.com/otrazhenie.k',
  vkUrl: 'https://vk.ru/club240229713',
  // ll+z центрируют карту на доме, text даёт подписанную карточку адреса прямо
  // на здании. Обычная метка (pt=...,pm2bl*) рисуется мелкой: виджет игнорирует
  // букву размера в стиле метки, поэтому крупную точку так получить нельзя.
  mapEmbedUrl:
    `https://yandex.ru/map-widget/v1/?ll=${MAP_LON}%2C${MAP_LAT}&z=17` +
    `&text=${encodeURIComponent(MAP_QUERY)}`,
  // Открыть этот же дом в Яндекс.Картах — оттуда сразу строится маршрут
  mapLinkUrl: `https://yandex.ru/maps/?ll=${MAP_LON}%2C${MAP_LAT}&z=17&text=${encodeURIComponent(MAP_QUERY)}`,
}
