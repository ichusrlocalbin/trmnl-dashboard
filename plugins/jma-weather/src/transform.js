// Reshapes the JMA forecast JSON into what the dashboard draws. Two urls are polled, so TRMNL hands
// them over as IDX_0 (the forecast, { data: [threeDay, weekly] }) and IDX_1 (the 3-hourly forecast).
//
// Icons are { base, change, to }: base and to are sunny / cloudy / rain / snow / thunder /
// heavy_rain / heavy_snow, and change is
// "later" (のち) or "sometimes" (時々・一時). The three-day forecast carries a sentence, which is
// parsed directly. The weekly forecast carries only codes.

const AREA_CODE = '130010' // 東京地方
const CITY_CODE = '44132' // 東京（気温）
const DOW = ['日', '月', '火', '水', '木', '金', '土']

const WORDS = [
  ['晴', 'sunny'], ['くもり', 'cloudy'], ['曇', 'cloudy'], ['雨', 'rain'], ['雪', 'snow'], ['雷', 'thunder']
]

function kindsIn(text) {
  const found = []
  for (let i = 0; i < text.length; i++) {
    const hit = WORDS.find(([word]) => text.startsWith(word, i))
    if (!hit) continue
    if (!found.includes(hit[1])) found.push(hit[1])
    i += hit[0].length - 1
  }
  return found
}

// 「晴れ　夕方から　くもり」「晴れ　夜　くもり」 -> { base: sunny, change: later, to: cloudy }
// Two kinds of weather mean a change: 時々/一時 is "sometimes", anything else (のち, から, 夜 ...) "later".
// 「雨　で　雷　を　伴う」 draws as thunder, and 激しく / 大雨 / 大雪 / 暴風 as heavy rain or snow.
function iconFromText(text) {
  let kinds = kindsIn(text)
  if (kinds.includes('thunder')) kinds = kinds.filter((k) => k !== 'rain')
  if (/激しく|大雨|強く降る|暴風雨/.test(text)) kinds = kinds.map((k) => (k === 'rain' ? 'heavy_rain' : k))
  if (/大雪|暴風雪|風雪/.test(text)) kinds = kinds.map((k) => (k === 'snow' ? 'heavy_snow' : k))
  const [base = 'cloudy', to] = kinds
  if (!to) return { base }
  return { base, change: /時々|一時/.test(text) ? 'sometimes' : 'later', to }
}

// JMA weather codes: the first digit is the main weather and the last two the change, 01-09 for
// 時々/一時 and 10-19 for のち (e.g. 101 晴時々曇, 111 晴後曇, 313 雨後曇). Sub-codes not listed here
// (朝夕, 暴風 ...) fall back to the main weather alone.
const BASES = { 1: 'sunny', 2: 'cloudy', 3: 'rain', 4: 'snow' }
const WET_SUBS = {
  2: 'rain', 3: 'rain', 4: 'snow', 5: 'snow', 6: 'rain', 7: 'rain', 8: 'thunder',
  12: 'rain', 13: 'rain', 14: 'rain', 15: 'snow', 16: 'snow', 17: 'snow', 18: 'rain', 19: 'thunder'
}
const SUBS = {
  sunny: { 1: 'cloudy', 10: 'cloudy', 11: 'cloudy', ...WET_SUBS },
  cloudy: { 1: 'sunny', 10: 'sunny', 11: 'sunny', ...WET_SUBS },
  rain: { 1: 'sunny', 3: 'snow', 11: 'sunny', 13: 'cloudy', 14: 'snow', 15: 'snow' },
  snow: { 1: 'sunny', 3: 'rain', 11: 'sunny', 13: 'cloudy', 14: 'rain' }
}

// Whole codes for severe weather (308 雨で暴風を伴う, 350 雨で雷を伴う, 405 大雪, 406 風雪強い, 407 暴風雪).
const SEVERE = { 308: 'heavy_rain', 350: 'thunder', 405: 'heavy_snow', 406: 'heavy_snow', 407: 'heavy_snow' }

function iconFromCode(code) {
  if (SEVERE[code]) return { base: SEVERE[code] }
  const base = BASES[code[0]] || 'cloudy'
  const sub = Number(code.slice(1))
  const to = SUBS[base][sub]
  if (!to) return { base }
  return { base, change: sub >= 10 ? 'later' : 'sometimes', to }
}

const dateOf = (iso) => iso.slice(0, 10)
const num = (v) => (v === '' || v == null ? null : Number(v))
// 「晴れ　夕方　から　くもり」 -> 「晴れ 夕方から くもり」
const spaces = (s) => s.replace(/　+(から|まで)/g, '$1').replace(/　+/g, ' ').trim()
const dowOf = (date) => DOW[new Date(`${date}T00:00:00Z`).getUTCDay()]
const inArea = (series, code) => series.areas.find((a) => a.area.code === code) || series.areas[0]

function labelOf(date, today) {
  const diff = Math.round((Date.parse(date) - Date.parse(today)) / 86400000)
  return ['今日', '明日', '明後日'][diff] || ''
}

// The 3-hourly forecast (地域時系列予報): weather for the area and temperature for the city, from the
// slot now in progress, 8 slots (24 hours).
function hoursOf(series, now) {
  if (!series?.areaTimeSeries || !series?.pointTimeSeries) return []
  const area = series.areaTimeSeries
  const point = series.pointTimeSeries
  return area.timeDefines
    .map((t, i) => {
      const at = t.dateTime
      const j = point.timeDefines.findIndex((p) => p.dateTime === at)
      return {
        at,
        hour: Number(at.slice(11, 13)),
        text: area.weather[i],
        icon: iconFromText(area.weather[i]),
        temp: j < 0 ? null : num(point.temperature[j])
      }
    })
    .filter((h) => Date.parse(h.at) + 3 * 3600000 > now)
    .slice(0, 8)
}

function run(input) {
  const forecast = input.IDX_0 || input
  // A failed poll leaves no data. Returning nothing keeps TRMNL's previous data on screen.
  if (!Array.isArray(forecast.data) || forecast.data.length < 2) return {}
  const [threeDay, weekly] = forecast.data
  const reportedAt = threeDay.reportDatetime
  const today = dateOf(reportedAt)
  const [weatherTs, popTs, tempTs] = threeDay.timeSeries
  const area = inArea(weatherTs, AREA_CODE)
  const pops = inArea(popTs, AREA_CODE).pops
  const temps = inArea(tempTs, CITY_CODE).temps

  // Temperatures come as 00:00 (min) and 09:00 (max) per day. After the morning report, today's
  // min repeats the max, so it is dropped.
  const tempAt = (date, hour) => {
    const i = tempTs.timeDefines.findIndex((t) => dateOf(t) === date && t.slice(11, 13) === hour)
    return i < 0 ? null : num(temps[i])
  }

  const days = weatherTs.timeDefines.map((t, i) => {
    const date = dateOf(t)
    const dayPops = popTs.timeDefines
      .map((p, j) => (dateOf(p) === date ? num(pops[j]) : null))
      .filter((v) => v != null)
    const max = tempAt(date, '09')
    const min = tempAt(date, '00')
    return {
      date,
      label: labelOf(date, today),
      dow: dowOf(date),
      text: spaces(area.weathers[i]),
      code: area.weatherCodes[i],
      icon: iconFromText(area.weathers[i]),
      temp_max: max,
      temp_min: date === today && min === max ? null : min,
      pop: dayPops.length ? Math.max(...dayPops) : null
    }
  })

  const weekWeather = inArea(weekly.timeSeries[0], AREA_CODE)
  const weekTemps = inArea(weekly.timeSeries[1], CITY_CODE)
  const week = weekly.timeSeries[0].timeDefines.map((t, i) => {
    const date = dateOf(t)
    const day = days.find((d) => d.date === date)
    return {
      date,
      dow: dowOf(date),
      code: weekWeather.weatherCodes[i],
      icon: day ? day.icon : iconFromCode(weekWeather.weatherCodes[i]),
      temp_max: num(weekTemps.tempsMax[i]) ?? day?.temp_max ?? null,
      temp_min: num(weekTemps.tempsMin[i]) ?? day?.temp_min ?? null,
      pop: num(weekWeather.pops[i]) ?? day?.pop ?? null
    }
  })

  return { reported_at: reportedAt, area: area.area.name, days, hours: hoursOf(input.IDX_1, Date.now()), week }
}
