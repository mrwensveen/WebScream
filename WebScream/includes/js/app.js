/* eslint no-extra-parens: ["error", "all", { "nestedBinaryExpressions": false }] */

require.config({
	paths: {
		'jquery': 'https://cdnjs.cloudflare.com/ajax/libs/jquery/3.3.1/jquery.min',
		'jquery-private': 'modules/jquery.no-conflict',
		'Vue': 'https://cdnjs.cloudflare.com/ajax/libs/vue/2.6.9/vue.min',
		'Tone': 'https://cdnjs.cloudflare.com/ajax/libs/tone/13.0.1/Tone.min'
	},
	map: {
		'*': {
			'jquery': 'jquery-private'
		},
		'jquery-private': {
			'jquery': 'jquery'
		}
	}
});

require(['jquery', 'Vue', 'track'], function ($, Vue, track) {

	$('#open button').click(function () {
		track.Open($('#s3mFile')[0], function (s3mFile) {
			Object.freeze(s3mFile);
			console.log(s3mFile);

			var app = new Vue({
				el: '#view',
				data: {
					s3m: s3mFile,
					FLAGS: track.FLAGS,
					currentView: 1,
					currentInstrument: 0,
					currentPattern: 0
				},
				methods: {
					setView: function (event) {
						console.log(event.key);
					},
					hex: function (value) {
						return Number.isInteger(value) ? value.toString(16).toUpperCase() : '0';
					},
					zeroPad: function (value, n) {
						return ('0'.repeat(n) + value).slice(n * -1);
					},
					displayChannel: function (c) {
						let channel = this.s3m.channels[c - 1];

						let display;
						if (channel.unused) {
							display = '(--)';
						} else {
							display = channel.outputChannel < 8 ? 'L' + (channel.outputChannel + 1) :
								channel.outputChannel < 16 ? 'R' + (channel.outputChannel - 7) :
									channel.outputChannel < 30 ? 'A' + (channel.outputChannel - 15) : '??';

							if (channel.disabled) {
								display = '(' + display + ')';
							} else {
								display = '\xa0' + display + ' ';
							}
						}

						return display;
					},
					displayPanning: function (c) {
						let channel = this.s3m.channels[c - 1];
						return channel.defaultPanning ? '.' : this.hex(channel.panning);
					},
					displayNote: function (p, r, c) {
						let value = this.s3m.patterns[p][r - 1][c - 1];

						return (value && value.note) ?
							(value.note === 0xFE ? '^^.' : track.NOTES[value.note & 0x0F] + (value.note >> 4)) :
							'...';
					},
					displayVolume: function (p, r, c) {
						let value = this.s3m.patterns[p][r - 1][c - 1];

						return (value && value.volume) ? this.zeroPad(value.volume, 2) : '..';
					},
					displayInstrument: function (p, r, c) {
						let value = this.s3m.patterns[p][r - 1][c - 1];

						return (value && value.instrument) ? this.zeroPad(value.instrument, 2) : '..';
					},
					displayCommand: function (p, r, c) {
						let value = this.s3m.patterns[p][r - 1][c - 1];

						return (value && value.command && value.info) ?
							String.fromCharCode(value.command + 0x40) + this.zeroPad(this.hex(value.info), 2) : '.00'; // 'A' starts at character code 0x41 / 65 in ASCII
					},
					flag: function (value) {
						return value ? 'on' : '--';
					},
					displayType: function (type) {
						switch (type) {
							case 1: return 'SMP';
							case 2: return 'AME';
							case 3: return 'ADR';
							default: return '---';
						}
					},
					play: function (instrument, event) {
						if (instrument.play) {
							let note = 0;
							if (typeof event.key === 'undefined' || (note = 'zsxdcvgbhnjm'.indexOf(event.key.toLowerCase())) > -1) {
								instrument.play(note, event.shiftKey ? 2 : 1);
							}
						}
					}
				}
			});
			$('#open').hide();
			$('#view').show();

			$('body').keyup(function (event) {
				if (event.altKey && '123'.includes(event.key)) {
					event.preventDefault();
					app.currentView = parseInt(event.key);
				}
			});
		});
	});
});
