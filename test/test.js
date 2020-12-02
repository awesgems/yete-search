let yts = require( '../dist/yt-search.js' )

const lsp = require( 'looks-same-plus' )

if ( !!process.env.debug ) {
  yts = require( '../src/index.js' )
}

// delay executions to avoid getting throttled by youtube
const _yts = yts
yts = async function ( o, c ) {
  let promise, _res, _rej

  if ( !c ) {
    promise = new Promise( function ( res, rej ) {
      _res = res
      _rej = rej
    } )
  }

  await new Promise( function ( res ) {
    setTimeout( res, 2000 )
  } )

  try {
    const r = await _yts( o )
    if ( c ) {
      c( undefined, r )
    } else {
      _res( r )
    }
  } catch ( err ) {
    if ( c ) {
      c( err )
    } else {
      _rej( err )
    }
  }

  return promise
}

const test = require( 'tape' )

test( 'basic search', function ( t ) {
  t.plan( 5 )

  yts( 'philip glass koyaanisqatsi', function ( err, r ) {
    t.error( err, 'no errors OK!' )

    const list = r.videos

    const koyaani = list.filter( function ( song ) {
      const keep = (
        song.title.toLowerCase().indexOf( 'koyaani' ) >= 0 &&
        song.title.toLowerCase().indexOf( 'glass' ) >= 0 &&
        ( song.author.name === 'DJDumato' ) &&
        song.seconds > 100 &&
        song.duration.seconds > 100 &&
        song.views > ( 100 * 1000 )
      )

      // console.log( song )

      return keep
    } )[ 0 ]

    console.log( koyaani )

    t.ok( koyaani, 'found koyaani OK!' )
    t.equal( koyaani.videoId, '_4Vt0UGwmgQ', 'koyani video id equal!' )
    t.equal( koyaani.timestamp, '3:29', 'koyani video timestamp equal!' )
    t.ok( koyaani.description.indexOf(
      'Koyaanisqatsi: Life out of balance ∞ um documentário lan°ado em 1983 dirigido'
    ), 'koyani video timestamp equal!' )
  } )
} )

test( 'make sure no live streams show up in video results', function ( t ) {
  t.plan( 2 )

  yts( 'minecraft LIVE', function ( err, r ) {
    t.error( err, 'no errors OK!' )

    const list = r.videos
    t.plan( list.length * 2 + 1 + 1 ) // update plan count based on results
    list.forEach( function ( video ) {
      t.ok( video.views > 0, 'views OK!' )
      t.ok( video.ago, 'ago OK!' )
    } )

    t.ok( list.length > 0, 'found some videos among live OK!' )
  } )
} )

test( 'videos, playlists and users/channels', async function ( t ) {
  t.plan( 3 )

  // Fri Oct 23 08:15:36 EEST 2020
  // looks like sometimes channel results don't show up, so combine a few
  // searches to try and ensure some show up
  const r1 = await yts( 'pewdiepie channel' )
  const r2 = await yts( 'valyrae channel' )
  const r3 = await yts( 'dr disrespect channel' )

  const videos = r1.videos.concat( r2.videos ).concat( r3.videos )
  const channels = r1.channels.concat( r2.channels ).concat( r3.channels )

  t.ok( videos.length > 0, 'videos found' )
  t.ok( channels.length > 0, 'accounts/channels found' )

  const r4 = await yts( 'pewdiepie list' )
  t.ok( r4.playlists.length > 0, 'playlists found' )
} )

test( 'find live streams', function ( t ) {
  t.plan( 12 )

  yts( 'live streams', function ( err, r ) {
    t.error( err, 'no errors OK!' )

    const videos = r.videos
    const live = r.live

    t.ok( live.length > 0, 'live streams found' )

    const topLiveStream = r.live.sort( function ( a, b ) { return b.watching - a.watching } )[ 0 ]

    const descriptions = r.live.reduce( function ( a, c ) {
      return a + c.description
    }, '' )
    t.ok( descriptions.length > 3, '(all) descriptions probably OK!' )

    t.equal( topLiveStream.type, 'live', 'type "live" OK!' )
    t.ok( topLiveStream.videoId.length > 4, 'videoId probably OK!' )
    t.ok( topLiveStream.url.indexOf( 'http' ) >= 0, 'url probably OK!' )

    t.ok( topLiveStream.description.length >= 0, 'description probably OK!' )

    t.ok( topLiveStream.image.indexOf( 'http' ) >= 0, 'image probably OK!' )
    t.ok( topLiveStream.watching >= 1, 'watching probably OK!' )
    t.ok( topLiveStream.author, 'author probably OK!' )
    t.ok( topLiveStream.author.name, 'author name probably OK!' )
    t.ok( topLiveStream.author.url.indexOf( 'http' ) >= 0, 'author url probably OK!' )
  } )
} )

test( 'test order and relevance', function ( t ) {
  t.plan( 2 )

  const opts = {
    search: "Josh A & Jake Hill - Rest in Pieces (Lyrics)"
  }

  yts( opts, function ( err, r ) {
    t.error( err, 'no errors OK!' )

    const topVideos = r.videos.slice( 0, 5 )

    let hasTitle = false
    topVideos.forEach( function ( v ) {
      if ( v.title.match( /josh.*jake.*hill.*rest.*piece.*lyric/i ) ) {
        hasTitle = true
      }
    } )

    t.ok( hasTitle, 'relevance and order OK' )
  } )
} )

test( 'test non-en same top results and duration parsing', function ( t ) {
  t.plan( 4 )

  const opts = {
    search: "Josh A & Jake Hill - Rest in Pieces (Lyrics)"
  }

  yts( opts, function ( err, r ) {
    t.error( err, 'no errors OK!' )

    const topVideo = r.videos[ 0 ]

    yts( {
      search: opts.search,
      hl: 'fi'
    }, function ( err, r ) {
      t.error( err, 'no errors OK!' )

      const videos = r.videos

      t.equal( topVideo.title, videos[ 0 ].title, 'top result title the same!' )
      t.equal( topVideo.duration.timestamp, videos[ 0 ].duration.timestamp, 'top result timestamp the same!' )
    } )
  } )
} )

test( 'search by video id', function ( t ) {
  t.plan( 3 )

  const opts = {
    search: "_JzeIf1zT14"
  }

  yts( opts, function ( err, r ) {
    t.error( err, 'no errors OK!' )

    for ( video of r.videos ) {
      if ( video.videoId == opts.search ) {
        t.ok( video.title.match( /josh.*jake.*hill.*rest.*piece.*lyric/i ), 'top result title matched!' )
        t.ok( video.videoId, opts.search, 'top result video id matched!' )
        break
      }
    }
  } )
} )

test( 'video metadata by id', function ( t ) {
  t.plan( 14 )

  yts( { videoId: 'e9vrfEoc8_g' }, function ( err, video ) {
    t.error( err, 'no errors OK!' )

    const MILLION = 1000 * 1000

    t.equal( video.title, 'Superman Theme', 'title' )
    t.equal( video.videoId, 'e9vrfEoc8_g', 'videoId' )
    t.equal( video.url, 'https://youtube.com/watch?v=e9vrfEoc8_g' )

    t.equal( video.timestamp, '4:13', 'timestamp' )
    t.equal( video.seconds, 253, 'seconds (duration)' )

    t.equal( video.description, 'The theme song from Superman: The Movie', 'description' )

    t.ok( video.views > ( 35 * MILLION ), 'views over 35 Million' )

    t.equal( video.genre, 'music', 'genre is music' )
    t.equal( video.uploadDate, '2009-7-27', 'uploadDate' )
    t.equal( video.ago, '11 years ago', 'agoText' )

    // t.equal( video.author.id, 'Redmario2569', 'author id' )
    t.equal( video.author.url, 'https://youtube.com/user/Redmario2569', 'author url' )

    t.equal( video.image, 'https://i.ytimg.com/vi/e9vrfEoc8_g/hqdefault.jpg', 'image' )
    t.equal( video.image, video.thumbnail, 'common alternative' )
  } )
} )

test( 'video metadata by faulty/non-existing id', function ( t ) {
  t.plan( 1 )

  yts( { videoId: 'X9vrfEoc8_g' }, function ( err, video ) {
    t.ok( err, 'video unavailable ok' )
  } )
} )

test( 'video metadata by id _JzeIf1zT14', function ( t ) {
  t.plan( 13 )

  yts( { videoId: '_JzeIf1zT14' }, function ( err, video ) {
    t.error( err, 'no errors OK!' )

    const MILLION = 1000 * 1000

    t.equal( video.title, 'Josh A & Jake Hill - Rest in Pieces (Lyrics)', 'title' )
    t.equal( video.videoId, '_JzeIf1zT14', 'videoId' )
    t.equal( video.url, 'https://youtube.com/watch?v=_JzeIf1zT14' )

    t.equal( video.timestamp, '2:27', 'timestamp' )
    t.equal( video.seconds, 147, 'seconds (duration)' )

    t.ok( video.description.indexOf( 'Produced by: Josh' ) >= 0, 'description' )

    t.ok( video.views > ( 1 * MILLION ), 'views over 1 Million' )

    t.equal( video.genre, 'music', 'genre is music' )
    t.equal( video.uploadDate, '2018-10-12', 'uploadDate' )

    // t.equal( video.author.id, 'UCF7YjO3SzVUGJYcXipRY0zQ', 'author id' )
    t.equal( video.author.url, 'https://youtube.com/channel/UCF7YjO3SzVUGJYcXipRY0zQ', 'author url' )

    t.equal( video.image, 'https://i.ytimg.com/vi/_JzeIf1zT14/hqdefault.jpg', 'image' )
    t.equal( video.image, video.thumbnail, 'common alternative' )
  } )
} )

test( 'playlist metadata by id', function ( t ) {
  t.plan( 20 )

  yts( { listId: 'PL7k0JFoxwvTbKL8kjGI_CaV31QxCGf1vJ' }, function ( err, playlist ) {
    t.error( err, 'no errors OK!' )

    t.equal( playlist.title, 'Superman Themes', 'title' )
    t.equal( playlist.listId, 'PL7k0JFoxwvTbKL8kjGI_CaV31QxCGf1vJ', 'listId' )

    t.equal( playlist.url, 'https://youtube.com/playlist?list=PL7k0JFoxwvTbKL8kjGI_CaV31QxCGf1vJ', 'playlist url' )

    t.ok( playlist.videos.length >= 10 , 'videos equal or over 10 (as of 2020-01-08)' )
    t.ok( playlist.views > 300, 'views over 300 (as of 2020-01-08)' )

    t.equal( playlist.videos[ 0 ].duration.seconds, 60 * 1 + 37, 'play list video 1 duration.seconds ok' )
    t.equal( playlist.videos[ 0 ].duration.timestamp, '1:37', 'play list video 1 duration.timestamp ok' )

    t.equal( playlist.videos[ 9 ].duration.seconds, 60 * 6 + 45, 'play list video 2 duration.seconds ok' )
    t.equal( playlist.videos[ 9 ].duration.timestamp, '6:45', 'play list video 2 duration.timestamp ok' )

    t.equal( playlist.videos[ 1 ].duration.seconds, 0, '[deleted] play list video duration.seconds 0 OK' )
    t.equal( playlist.videos[ 3 ].duration.timestamp, 0, '[private] play list video duration.timestamp 0 OK' )

    t.equal(
      playlist.videos.filter( v => v.title ).length,
      playlist.videos.length,
      'no video titles are empty'
    )

    t.ok( playlist.videos.find(
      v => v.title === '[Deleted video]'
    ), 'Deleted video found' )

    t.ok( playlist.videos.find(
      v => v.title === '[Private video]'
    ), 'Private video found' )

    t.equal( playlist.date, '2018-6-25' , 'date' )

    t.equal( playlist.author.name, 'Cave Spider10', 'author name' )
    // t.equal( playlist.author.channelId, 'UCdwR7fIE2xyXlNRc7fb9tJg', 'author channelId' )
    t.equal( playlist.author.url, 'https://youtube.com/channel/UCdwR7fIE2xyXlNRc7fb9tJg', 'author url' )

    t.equal( playlist.image, 'https://i.ytimg.com/vi/IQtKjU_pOuw/hqdefault.jpg', 'playlist image' )
    t.equal( playlist.image, playlist.thumbnail, 'common alternative' )
  } )
} )

test( 'playlist metadata by faulty/non-existing id', function ( t ) {
  t.plan( 1 )

  yts( { listId: 'XLhf_RSaUvUVvuJHpeiTvnk5n99rlRM' }, function ( err, playlist ) {
    t.ok( err, 'playlist unavailable ok' )
  } )
} )

test( 'search results: playlist', function ( t ) {
  t.plan( 6 )

  yts( 'superman theme list', function ( err, r ) {
    t.error( err, 'no errors OK!' )

    const lists = r.playlists

    // Superman Theme Songs Playlist
    const sts = lists.filter( function ( playlist ) {
      const keep = (
        playlist.title.toLowerCase() === 'superman theme songs' &&
        playlist.author.name === 'AJ Lelievre' &&

        // is exactly 21 as of now but test with some leeway
        playlist.videoCount >= 12
      )

      return keep
    } )[ 0 ]

    t.equal( sts.url, 'https://youtube.com/playlist?list=PLYhKAl2FoGzC0IQkgfVtM991w3E8ro1yG', 'playlist url' )
    t.equal( sts.listId, 'PLYhKAl2FoGzC0IQkgfVtM991w3E8ro1yG', 'playlist id' )
    t.equal( sts.image, 'https://i.ytimg.com/vi/yCCq_6ankAI/hqdefault.jpg', 'playlist image' )
    t.equal( sts.image, sts.thumbnail, 'common alternative' )
    t.equal( sts.type, 'list', 'playlist type' )
  } )
} )

test( 'search results: channel', function ( t ) {
  t.plan( 7 )

  yts( 'PewDiePie', function ( err, r ) {
    t.error( err, 'no errors OK!' )

    const channels = r.channels
    const topChannel = channels[ 0 ]

    t.ok( topChannel, 'topChannel OK' )
    t.equal( topChannel.name, 'PewDiePie', 'channel name' )
    t.equal( topChannel.url, 'https://youtube.com/user/PewDiePie', 'channel url' )

    t.ok( topChannel.videoCount > 4000, 'video count more than' )
    t.ok( topChannel.videoCount < 10000, 'video count less than' )

    const channelImageUrl = (
      'https://yt3.ggpht.com/a/AATXAJwTuzNgKRSLVIOcVTVGGr_xFKgo8LFSQF163hCKSQ=s88-c-k-c0x00ffffff-no-rj-mo'
    )

    lsp(
      topChannel.image,
      channelImageUrl,
      { tolerance: 5 }, // ref: https://github.com/gemini-testing/looks-same
      function ( err, r ) {
        t.ok( r.equal, 'pewdiepie channel image OK!' )
      }
    )
  } )
} )

test( 'search results: channel sub count', function ( t ) {
  t.plan( 5 )

  yts( 'minecraft mojang channel', function ( err, r ) {
    t.error( err, 'no errors OK!' )

    const channels = r.channels
    const topChannel = channels[ 0 ]

    t.ok( topChannel, 'topChannel OK' )
    t.equal( topChannel.name, 'Minecraft', 'channel name' )
    t.ok( topChannel.subCount > 5000000, 'sub count more than' )
    t.ok( topChannel.subCount < 100000000, 'sub count less than' )
  } )
} )

test( 'search results: all', function ( t ) {
  t.plan( 2 )

  yts( 'minecraft', function ( err, r ) {
    t.error( err, 'no errors OK!' )

    t.equal(
      r.videos.length + r.lists.length + r.channels.length + r.live.length,
      r.all.length,
      'all length OK'
    )
  } )
} )

test( 'search "王菲 Faye Wong"', function ( t ) {
  t.plan( 6 )

  yts( '王菲 Faye Wong', function ( err, r ) {
    t.error( err, 'no errors OK!' )

    const channels = r.channels
    const topChannel = channels[ 0 ]

    t.ok( topChannel, 'topChannel OK' )
    t.equal( topChannel.name, 'Faye Wong Official Channel', 'channel name' )
    t.equal( topChannel.url, 'https://youtube.com/channel/UCos8gkwQivJ_hHeoCcs6yXg', 'channel url' )

    t.ok( topChannel.videoCount >= 20, 'video count' )

    const channelImageUrl = (
      'https://yt3.ggpht.com/a/AATXAJxg1ZCD6conNklSAF7wwtwlx5q4FlO7EpNRi_nSpw=s88-c-k-c0x00ffffff-no-rj-mo'
    )

    lsp(
      topChannel.image,
      channelImageUrl,
      { tolerance: 5 }, // ref: https://github.com/gemini-testing/looks-same
      function ( err, r ) {
        t.ok( r.equal, 'channel image OK!' )
      }
    )
  } )
} )

test( 'test promise support ( search by video id )', async function ( t ) {
  t.plan( 2 )

  const opts = {
    search: "_JzeIf1zT14"
  }

  const r = await yts( opts )

  const topVideo = r.videos[ 0 ]

  for ( video of r.videos ) {
    if ( video.videoId == opts.search ) {
      t.ok( video.title.match( /josh.*jake.*hill.*rest.*piece.*lyric/i ), 'top result title matched!' )
      t.ok( video.videoId, opts.search, 'top result video id matched!' )
      break
    }
  }
} )
