// photo-gps.js — read GPS coordinates out of a photo's EXIF data (JPEG only)
// so an uploaded photo can drop a precise "Open in Maps" pin at the spot it
// was actually taken, instead of relying on the free-text address field.
// Plain JS (no JSX/build step) — window global, matches parser.js's convention.

(function () {
  function readRational(view, offset, little) {
    const num = view.getUint32(offset, little);
    const den = view.getUint32(offset + 4, little);
    return den === 0 ? 0 : num / den;
  }

  function dmsToDecimal(d, m, s, ref) {
    let dec = d + m / 60 + s / 3600;
    if (ref === "S" || ref === "W") dec = -dec;
    return dec;
  }

  // Walks one IFD looking for GPS tags (called on IFD0 first, then on the GPS sub-IFD).
  function readIFDEntries(view, ifdOffset, tiffStart, little) {
    const count = view.getUint16(ifdOffset, little);
    const entries = {};
    for (let i = 0; i < count; i++) {
      const entryOffset = ifdOffset + 2 + i * 12;
      const tag = view.getUint16(entryOffset, little);
      const type = view.getUint16(entryOffset + 2, little);
      const numValues = view.getUint32(entryOffset + 4, little);
      entries[tag] = { type, numValues, valueOffset: entryOffset + 8 };
    }
    return entries;
  }

  function parseGPSIFD(view, gpsIfdOffset, tiffStart, little) {
    const entries = readIFDEntries(view, gpsIfdOffset, tiffStart, little);
    const latRefEntry = entries[0x0001];
    const latEntry = entries[0x0002];
    const lonRefEntry = entries[0x0003];
    const lonEntry = entries[0x0004];
    if (!latEntry || !lonEntry || !latRefEntry || !lonRefEntry) return null;

    const latRef = String.fromCharCode(view.getUint8(latRefEntry.valueOffset));
    const lonRef = String.fromCharCode(view.getUint8(lonRefEntry.valueOffset));
    const latDataOffset = tiffStart + view.getUint32(latEntry.valueOffset, little);
    const lonDataOffset = tiffStart + view.getUint32(lonEntry.valueOffset, little);

    const lat = dmsToDecimal(
      readRational(view, latDataOffset, little),
      readRational(view, latDataOffset + 8, little),
      readRational(view, latDataOffset + 16, little),
      latRef
    );
    const lng = dmsToDecimal(
      readRational(view, lonDataOffset, little),
      readRational(view, lonDataOffset + 8, little),
      readRational(view, lonDataOffset + 16, little),
      lonRef
    );
    if (!isFinite(lat) || !isFinite(lng) || (lat === 0 && lng === 0)) return null;
    return { lat, lng };
  }

  function parseExifBuffer(view, tiffStart) {
    const byteOrder = view.getUint16(tiffStart, false);
    const little = byteOrder === 0x4949; // "II"
    if (byteOrder !== 0x4949 && byteOrder !== 0x4d4d) return null;
    const ifd0Offset = tiffStart + view.getUint32(tiffStart + 4, little);
    const ifd0 = readIFDEntries(view, ifd0Offset, tiffStart, little);
    const gpsPointer = ifd0[0x8825]; // GPS IFD tag
    if (!gpsPointer) return null;
    const gpsIfdOffset = tiffStart + view.getUint32(gpsPointer.valueOffset, little);
    return parseGPSIFD(view, gpsIfdOffset, tiffStart, little);
  }

  // Returns { lat, lng } or null. Only JPEG carries this EXIF/TIFF structure;
  // other formats (PNG, HEIC, WebP) resolve to null without erroring.
  function extractPhotoGPS(file) {
    return new Promise((resolve) => {
      if (file.type !== "image/jpeg") return resolve(null);
      const reader = new FileReader();
      reader.onerror = () => resolve(null);
      reader.onload = (e) => {
        try {
          const view = new DataView(e.target.result);
          if (view.getUint16(0) !== 0xffd8) return resolve(null); // not a JPEG
          let offset = 2;
          while (offset < view.byteLength - 4) {
            const marker = view.getUint16(offset);
            if (marker === 0xffe1) {
              const segLength = view.getUint16(offset + 2);
              const exifTag = view.getUint32(offset + 4);
              if (exifTag === 0x45786966) {
                const tiffStart = offset + 10; // past marker(2) + length(2) + "Exif\0\0"(6)
                return resolve(parseExifBuffer(view, tiffStart));
              }
              offset += 2 + segLength;
            } else if ((marker & 0xff00) === 0xff00) {
              offset += 2 + view.getUint16(offset + 2);
            } else {
              break;
            }
          }
          resolve(null);
        } catch (err) {
          resolve(null);
        }
      };
      // Only the first ~256KB ever contains EXIF (it's near the file start) — avoids
      // reading a full multi-MB photo into memory just to look at its header.
      reader.readAsArrayBuffer(file.slice(0, 262144));
    });
  }

  window.extractPhotoGPS = extractPhotoGPS;
})();
