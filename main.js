import config from '@arcgis/core/config';
import ArcGISMap from '@arcgis/core/Map';
import MapView from '@arcgis/core/views/MapView';
import Search from '@arcgis/core/widgets/Search';
import Polygon from '@arcgis/core/geometry/Polygon';
import { whenFalseOnce, pausable } from '@arcgis/core/core/watchUtils';
import { getScale } from '@arcgis/core/geometry/support/scaleUtils';

import * as Tone from 'tone'

import bases from './libs/encoder';
import { oqtm as gdgg } from './libs/gdgg';

config.apiKey = 'AAPK6f433fecf80d4d17b1510d043ea28f65h4D1jbtaAiyCqRy2w7NQOF8NAbQ0k4wQNHAM3nx4OMr3QHIzN8WLMEqCFLPUfYkc';

import './style.css';

const btn = document.getElementById('btnStart');

const map = new ArcGISMap({
  basemap: 'arcgis-colored-pencil'
});

const view = new MapView({
  map,
  container: 'viewDiv',
  center: [-118, 34],
  zoom: 6
});

const search = new Search({ view });

view.ui.add(search, 'top-right');
view.ui.add(btn, 'top-right');

btn,addEventListener('click', () => {
  Tone.start();
});

let precisionLimit = 45;
// Find precisions given the GDGG ones and the bases' ones.
let validPrecisions = [];
for (let i in bases.precisions) {
  let max = 0;
  for (let j in gdgg.hashPrecisions) {
    if (bases.precisions[i] > gdgg.hashPrecisions[j]) {
      max = Math.max(gdgg.hashPrecisions[j], max);
    }
  }
  if (max && validPrecisions.indexOf(max) === -1 && max <= precisionLimit) {
    validPrecisions.push(max);
  }
}

let precision = validPrecisions[0];

view.when(() => {

  const baseLayer = map.basemap.baseLayers.getItemAt(0);
  console.log(baseLayer);

  const autotune = () => {
    const { center } = view;
    const vZoom = view.zoom;
    for (let i in validPrecisions) {
      let p = validPrecisions[i];
      const hash = gdgg.latLngToReadableHash(center.latitude, center.longitude, p);
      const trig = gdgg.readableHashToArea(hash);
      const rings = trig.map(({ lat, lng }) => ([lng, lat]));
      const polygon = new Polygon({ rings });
      const scale = getScale({
        width: view.width,
        extent: polygon.extent
      });
      const zoom = baseLayer.tileInfo.scaleToZoom(scale);
      if (zoom <= vZoom) {
        precision = validPrecisions[+i + 2] || p;
      }
    }
  };

  autotune();

  const handle = pausable(view, 'scale', () => {
    handle.pause();
    whenFalseOnce(view, 'updating', () => {
        autotune();
        handle.resume();
    });
  });
  const synth = new Tone.Synth().toDestination();
  let currentHash = null;
  // view.on('click', ({ mapPoint }) => {
  view.on('pointer-move', (e) => {
    const mapPoint = view.toMap(e); 
    const { latitude, longitude } = mapPoint;
		const numericHash = gdgg.latLngToNumericHash(latitude, longitude, precision);
		const hash = gdgg.latLngToReadableHash(latitude, longitude, precision);
    if (hash === currentHash) return;
    view.graphics.removeAll();
    currentHash = hash;
		const trig = gdgg.readableHashToArea(hash);
		const rings = trig.map(({ lat, lng }) => ([lng, lat]));
		view.graphics.add({
			attributes: {},
			geometry: {
				type: 'polygon',
				rings
			},
      symbol: {
        type: 'simple-fill',
        outline: { color: [239, 234, 31, 1] },
        color: [57, 198, 226, 0.25]
      }
		});

		const noteHash = bases.hashToString(numericHash, precision);
		const noteList = noteHash.split(' ');
    const now = Tone.now();
    let t = 0;
    try {
      noteList.forEach((n) => {
        t++;
        synth.triggerAttack(n, now + t/12);
      });
      synth.triggerRelease(now + t/12);
    }
    catch(error) {
      console.log(error)
    }
  });
});
