'use strict';

var BrowserWindow = require('electron').BrowserWindow;
var ipc   = require('electron').ipcMain;
var spawn = require('child_process').spawn;
var bindings = require(global.upath.join(__dirname, '/../', 'bridge/bindings'));
// Generic URI OS-provided launcher
var baseCmd = 'xdg-open'
// Cached apps from user
,	apps 	= null
, 	_in_apps= require(global.upath.join(__dirname, '/../', 'misc/_in_apps.json'))
, 	_quitCB = function(){};

var _spawner = function( cmd, opts, cwd ){
	if( !cmd ){
		throw new Error('Spawner fucked up');
	}
	if( !opts ){
		opts = [];
	}else if( !(opts instanceof Array) ){
		opts = [opts];
	}
	console.log('[SCRIPT] Spawning', cmd, 'with options', opts);
	var child = spawn(cmd, opts, {
		detached: true,
		stdio: [ 'ignore', 'ignore', 'ignore' ],
		cwd: cwd?cwd:process.cwd()
	});
	//child.stdout.on('data', function(data){ console.log(data.toString('utf8')); });
	child.unref();
}

// INTERNALS

var _launchPreferences = function(){
	// Launch Preferences window
	console.log('[SCRIPT] launchPreferences');
	
	var settingsWindow = new BrowserWindow({
        width: 600,
        height: 300,
        center: true,
        resizable: true,
        darkTheme: true,
        frame: true,
        show: true,
        title: "The Mutant - Preferences"
    });

    settingsWindow.loadURL('file://' + global.upath.join( __dirname, '/../front/html/settings.html' ) );
    
    // Prepare settings
    function _prepare( shortcuts ){
    	var ret = [], aux = {};
    	Object.keys(shortcuts).forEach(function( key ){
    		aux[ 'command' ] = key;
    		aux[ 'shortcut' ] = shortcuts[ key ];
    		ret.push( aux );
    	})
    	return ret;
    }
	
	function _send(){
		settingsWindow.send('resultsForView', _prepare( global.settings.get('shortcuts') ));
	}

    ipc.on('prefsReady', _send);

	settingsWindow.on('close', function( evt ){
		console.log('[SCRIPT] Closing preferences');
		ipc.removeListener('ready', _send );
		settingsWindow = null;
		// Save
	})
}

var _quitApp = function(){
	// Quit app
	_quitCB();
}

var _netGo = function( exec, query ){

	var reg = REGEX.filter(function( item ){ return item.APP === 'netGo' });
	reg = reg[0];
	console.log('[SCRIPT] netGo', arguments, 'cached reg', reg);
	if( reg.PART_1.test( query ) ){
		// Lack endind
		query += '.com'
	}else if( reg.PART_2.test( query ) ){
		query = 'www.' + query;
	}
	_spawner( 'xdg-open', [query] );

}

var _netSearch = function( exec, query ){

	query = 'https://www.google.com/search?q=' + query;
	_spawner( 'xdg-open', [query] );

}

var _browseLaunch = function( exec, query ){
	// Unwrap object, link is on subtext
	query = exec.subText;
	_netGo( exec, query );
}

// Wrapper for deep copy, returns a new allocated object
// avoiding overwrittings, call exceptionally
var _getInternalApp = function( app ){
	var ret = {};
	if( _in_apps.hasOwnProperty( app ) ){
		for(var i in _in_apps[ app ]){
			ret[i] = _in_apps[ app ][ i ];
		}
	}
	return ret;
}
// In the future allow shortcuts
var REGEX = [
	{ REG: /PREFERENCE/i, APP: 'preference' , REG2: 'preference' },
	{ REG: /QUIT/i,		  APP: 'quit' 		, REG2: 'quit' },
	{ REG: /(?:(?:http|ftp|https)\:\/\/|(?:www\.))([^\.]*)(?:\.com|\.es)?|(?:(?:http|ftp|https)\:\/\/|(?:www\.))?([^\.]*)(?:\.com|\.es)/i, 
		APP: 'netGo', REG2: 'zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz',
		PART_1: /(?:(?:http|ftp|https)\:\/\/|(?:www\.))([^\.]*)/i,
		PART_2: /([^\.]*)(?:\.)/i
	}
]
/// /(?:(?:http|ftp|https)\:\/\/|(?:www\.))(.*)/i
/// (?:(?:http|ftp|https)\:\/\/|(?:www\.))?([^\.]*)(?:\.com|\.es)?
var _internalApps = {
	
	'preference': {
		'wrapper': _in_apps['preference']
		, fn: _launchPreferences 
	},
	'quit': {
		'wrapper': _in_apps['quit']
		, fn: _quitApp
	},
	'netGo': {
		'wrapper': _in_apps['netGo']
		, fn: _netGo
	},
	'netSearch': {
		'wrapper': _in_apps['netSearch']
		, fn: _netSearch
	},
	'browseHistory': {
		'wrapper': _in_apps['browseHistory']
		, fn: _browseLaunch
	}
}

var _strSearch = function( str, query ){
	str = str.toLowerCase();
	query = query.toLowerCase();
	return str.indexOf(query);
}

var _getRegexForQuery = function( query ){
	return ('/' + query + '/i');
}

var _search = function( query, callback ){
	// Parse query
	// order:
	// Preferences
	// Quit
	// URL
	// Apps
	// Bookmarks
	//console.log('searching', query);
	var matches = [];
	
	// Load apps
	if( !apps ){
		apps = require(__dirname + '/../cached/apps.json');
	}
	
	if( query !== '' && query !== ' '){
	
		// Preferences, Quit, Url
		REGEX.forEach(function( Q, idx ){
			var reg = _getRegexForQuery( query );
			//console.log('query', query, 'regex', Q.REG, 'test', Q.REG.test(query) );
			if( _strSearch( Q.REG2, query ) !== -1 || Q.REG.test( query ) ){
				//console.log('Match with', Q.REG2);
				matches.push( _internalApps[ Q.APP ].wrapper );
			}
		})
		// Broswser History files
		global.db.query(query, function( err, results ){
			if( !err ){
				//console.log('from scripts db query', results);
				// Deep copy
				var aux = _getInternalApp('browseHistory');
				results.forEach(function( result ){
					// Come in the form:
					// url: ...
					// title: ...
					// browser: ...
					aux.appName = result.title;
					aux.subText = result.url;
					bindings.send( [aux] );
				});
			}
		})
		// Apps
		apps.forEach(function( app, idx ){
			var reg = _getRegexForQuery( query );
			if( _strSearch( app.appName, query ) !== -1 ){
				//console.log('Match with', app.appName);
				matches.push( app );
			}
		})

	}
	//console.log(matches);
	if( matches.length === 0 ){
		matches.push( _internalApps['netSearch'].wrapper );
	}

	callback( null, matches );
}

var _cacheFiles = function( cmd, callback ){
	console.log('Spawning cacheFiles', cmd);
	var args = [];
	if( cmd.trim() !== '' ){
		args.push(cmd);
	}
	// Two steps, process every app, convert its icon
	var ch = spawn(__dirname + '/listApps', args, {cwd: __dirname});

	ch.stdout.on('data', function(data){ console.log(data.toString('utf8')); });
	
	ch.on('close', function(){
	
		var apps = require(__dirname + '/../cached/apps.json');
		var os = require('os');
		
		var Rsvg = require('librsvg').Rsvg;
		var fs = require('fs');
		var dstDir = global.upath.join( __dirname, '/../cached/icons');
		 
		var changes = [];
		var mkdirp = require('mkdirp');

		try{ fs.lstatSync( dstDir ); }catch(e){ mkdirp.sync( dstDir ); }
		
		global.async.forEachOf(apps, function( app, idx, callback ){
			
			//console.log('forEach');
			if( app.iconPath !== '__unknown__' ){
				// Check svg
				var trimmed = global.upath.removeExt( app.iconPath, 'svg' );
				if( trimmed === app.iconPath ){
					// Non svg, skip
					callback( null );
				}else{
					// svg, check if yet converted, else, convert it
					var mod = trimmed.split('/');

					mod = mod[mod.length-1];
					mod = global.upath.addExt(mod, 'png');
					mod = global.upath.join( dstDir, mod );
					fs.lstat( mod, function( err ){
						// Icon did exist
						if( !err ){
							changes.push({ 'idx': idx, 'mod': mod });
						    callback( null );
						}else{
							var svg = new Rsvg();
							// When finishing reading SVG, render and save as PNG image. 
							svg.on('finish', function() {
								fs.writeFile(mod, svg.render({
									format: 'png',
									width: 48,
									height: 48
								}).data, function( err, result ){
								    // if( err ) -- No change
								    if( !err ){
								    	changes.push({ 'idx': idx, 'mod': mod });
								    }
								    callback( null );
								});
							});
							 
							// Stream SVG file into render instance. 
							fs.createReadStream( app.iconPath ).pipe(svg);
						}
					})
				}
			}else{
				callback( null );
			}

		}, function( err ){
			//console.log('done processing', 'changes', changes, arguments);
			changes.forEach(function( item ){
				apps[ item.idx ].iconPath = item.mod;
			});
			fs.writeFile( __dirname + '/../cached/apps.json', JSON.stringify(apps, null, 4), callback );
		});
	})
}

var _processAndLaunch = function( exec, query ){
	// Unwrap object
	var cmd = exec.appCmd;
	var a = Object.keys( _internalApps );
	if( a.indexOf( cmd ) === -1 ){
		console.log('[SCRIPT] for spawner', exec, query);
		_spawner( cmd );
	}else{
		_internalApps[ a[a.indexOf( cmd )] ].fn( exec, query );
	}
}

module.exports = {
	cacheFiles: _cacheFiles,
	netGo: _netGo,
	search: _search,
	spawner: _spawner,
	processAndLaunch: _processAndLaunch,
	setQuitCallback: function( cb ){ _quitCB = cb }
}