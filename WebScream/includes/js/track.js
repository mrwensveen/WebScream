﻿var S3M = (function () {
	var FLAGS = Object.freeze({ "ST2_vibrato": 1, "ST2_tempo": 2, "Amiga_slides": 4, "Zero_vol_optimisations": 8, "Amiga_limits": 16, "Enable_SB_filter_sfx": 32, "ST300_volume_slides": 64, "PtrSpecial_valid": 128 });

	var open = function (input, callback) {
		// Check for the various File API support.
		if (window.File && window.FileReader && window.FileList && window.Blob) {
			if (input.files.length > 0) {
				var file = input.files[0];
				console.log(file.name);

				var ascii = new TextDecoder('ascii');

				var reader = new FileReader();
				reader.onload = function () {
					// The S3M file data
					var fileData = reader.result;
					console.log(fileData.byteLength);

					// References:
					// - http://www.shikadi.net/moddingwiki/S3M_Format
					// - https://wiki.multimedia.cx/index.php?title=Scream_Tracker_3_Module
					// - https://github.com/lclevy/unmo3/blob/master/spec/s3m.txt

					// Sanity check (sort of)
					var sanityBytes = new Uint8Array(fileData, 28, 2);
					if (sanityBytes[0] !== 0x1A && sanityBytes[1] !== 0x10) {
						alert('Not a valid S3M file!');
					}

					var fileDataView = new DataView(fileData);

					var s3mFile = {
						fileName: file.name,
						_data: fileData,

						header: {
							// static header properties
							title: ascii.decode(new Uint8Array(fileData, 0x00, 28)).split("\0")[0],
							sig1: fileDataView.getUint8(0x1C),
							type: fileDataView.getUint8(0x1D),
							reserved: fileDataView.getUint16(0x1E, true), // 00 00

							orderCount: fileDataView.getUint16(0x20, true),
							instrumentCount: fileDataView.getUint16(0x22, true),
							patternCount: fileDataView.getUint16(0x24, true),
							flags: fileDataView.getUint16(0x26, true),
							trackerVersion: fileDataView.getUint16(0x28, true),
							sampleType: fileDataView.getUint16(0x2A, true),
							sig2: ascii.decode(new Uint8Array(fileData, 0x2C, 4)), // 'SCRM'

							globalVolume: fileDataView.getUint8(0x30),
							initialSpeed: fileDataView.getUint8(0x31),
							initialTempo: fileDataView.getUint8(0x32),
							masterVolume: fileDataView.getUint8(0x33),
							ultraClickRemoval: fileDataView.getUint8(0x34),
							defaultPan: fileDataView.getUint8(0x35),
							reservedData: new Uint8Array(fileData, 0x36, 8),
							ptrSpecial: fileDataView.getUint16(0x3E, true), // parapointer

							channelSettings: new Uint8Array(fileData, 0x40, 32)
						},
						instruments: [],
						patterns: []
					};

					// calculated header properties
					Object.assign(s3mFile.header, {
						orderList: new Uint8Array(fileData, 0x60, s3mFile.header.orderCount)
					});

					var ptrInstruments = new DataView(fileData, 0x60 + s3mFile.header.orderCount, s3mFile.header.instrumentCount * 2); // parapointers
					for (let i = 0; i < s3mFile.header.instrumentCount; i++) {
						let offset = ptrInstruments.getUint16(i * 2, true) * 16;
						let instrumentHeaderView = new DataView(fileData, offset, 0x50);

						let instrument = {
							type: instrumentHeaderView.getUint8(0x00),
							filename: ascii.decode(new Uint8Array(instrumentHeaderView.buffer, instrumentHeaderView.byteOffset + 1, 12)).split("\0")[0]
						};

						// PCM instrument
						if (instrument.type === 1) {
							Object.assign(instrument, {
								pcmOffset: instrumentHeaderView.getUint8(0x0D) * 0x010000 + instrumentHeaderView.getUint16(0x0E, true), // parapointer
								length: instrumentHeaderView.getUint32(0x10, true),
								loopStart: instrumentHeaderView.getUint32(0x14, true),
								loopEnd: instrumentHeaderView.getUint32(0x18, true),
								volume: instrumentHeaderView.getUint8(0x1C),
								reserved: instrumentHeaderView.getUint8(0x1D),
								pack: instrumentHeaderView.getUint8(0x1E),
								flags: instrumentHeaderView.getUint8(0x1F),

								c2spd: instrumentHeaderView.getUint32(0x20),
								internal: new Uint8Array(instrumentHeaderView.buffer, instrumentHeaderView.byteOffset + 0x24, 12),

								title: ascii.decode(new Uint8Array(instrumentHeaderView.buffer, instrumentHeaderView.byteOffset + 0x30, 28)).split("\0")[0],
								sig: ascii.decode(new Uint8Array(instrumentHeaderView.buffer, instrumentHeaderView.byteOffset + 0x4C, 4)) // 'SCRS'
							});

							// TODO: Read sample data
							let pcmData = fileData.slice(instrument.pcmOffset * 16, instrument.pcmOffset * 16 + instrument.length);

							let pcmBlob = new Blob([pcmData], { type: 'audio/pcm' });

							//var a = document.createElement("a"),
							//	url = URL.createObjectURL(pcmBlob);
							//a.href = url;
							//a.download = i + "." + instrument.filename + ".pcm";
							//a.innerText = i + "." + instrument.filename + ".pcm";
							//document.body.appendChild(a);
						}

						s3mFile.instruments.push(instrument);
					}

					// TODO: Patterns
					//ptrPatterns: new Uint16Array(fileData, 96 + s3mFile.header.orderCount + s3mFile.header.instrumentCount * 2, s3mFile.header.patternCount)

					console.log(s3mFile);

					if (typeof callback !== 'undefined') {
						callback(s3mFile);
					}
				};

				reader.readAsArrayBuffer(file);

			}
		} else {
			alert('The File APIs are not fully supported in this browser.');
		}
	};

	return {
		FLAGS: FLAGS,
		open: open
	};
})();