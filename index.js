	;(function(window, undefined) {

'use strict';

var AudioPlayer = (function() {

  // Player vars
  var
  player = document.getElementById('ap'),
  playBtn,
  prevBtn,
  nextBtn,
  plBtn,
  repeatBtn,
  volumeBtn,
  progressBar,
  preloadBar,
  curTime,
  durTime,
  trackTitle,
  audio,
  index = 0,
  playList,
  volumeBar,
  volumeLength,
  repeating = false,
  seeking = false,
  rightClick = false,
  apActive = false,
  // playlist vars
  pl,
  plLi,
  // settings
  settings = {
    volume   : 0.1,
    autoPlay : false,
    notification: true,
    playList : []
  };

  function init(options) {

    if(!('classList' in document.documentElement)) {
      return false;
    }

    if(apActive || player === null) {
      return;
    }

    settings = extend(settings, options);

    // get player elements
    playBtn        = player.querySelector('.ap-toggle-btn');
    prevBtn        = player.querySelector('.ap-prev-btn');
    nextBtn        = player.querySelector('.ap-next-btn');
    repeatBtn      = player.querySelector('.ap-repeat-btn');
    volumeBtn      = player.querySelector('.ap-volume-btn');
    plBtn          = player.querySelector('.ap-playlist-btn');
    curTime        = player.querySelector('.ap-time--current');
    durTime        = player.querySelector('.ap-time--duration');
    trackTitle     = player.querySelector('.ap-title');
    progressBar    = player.querySelector('.ap-bar');
    preloadBar     = player.querySelector('.ap-preload-bar');
    volumeBar      = player.querySelector('.ap-volume-bar');

    playList = settings.playList;

    playBtn.addEventListener('click', playToggle, false);
    volumeBtn.addEventListener('click', volumeToggle, false);
    repeatBtn.addEventListener('click', repeatToggle, false);

    progressBar.parentNode.parentNode.addEventListener('mousedown', handlerBar, false);
    progressBar.parentNode.parentNode.addEventListener('mousemove', seek, false);
    document.documentElement.addEventListener('mouseup', seekingFalse, false);

    volumeBar.parentNode.parentNode.addEventListener('mousedown', handlerVol, false);
    volumeBar.parentNode.parentNode.addEventListener('mousemove', setVolume);
    document.documentElement.addEventListener('mouseup', seekingFalse, false);

    prevBtn.addEventListener('click', prev, false);
    nextBtn.addEventListener('click', next, false);


    apActive = true;

    // Create playlist
    renderPL();
    plBtn.addEventListener('click', plToggle, false);

    // Create audio object
    audio = new Audio();
    audio.volume = settings.volume;



    if(isEmptyList()) {
      empty();
      return;
    }

    audio.src = playList[index].file;
    audio.preload = 'auto';
    trackTitle.innerHTML = playList[index].title;
    volumeBar.style.height = audio.volume * 100 + '%';
    volumeLength = volumeBar.css('height');

    audio.addEventListener('error', error, false);
    audio.addEventListener('timeupdate', update, false);
    audio.addEventListener('ended', doEnd, false);

    if(settings.autoPlay) {
      audio.play();
      playBtn.classList.add('playing');
      plLi[index].classList.add('pl-current');
    }
  }

/**
 *  PlayList methods
 */
    function renderPL() {
      var html = [];
      var tpl =
        '<li data-track="{count}">'+
          '<div class="pl-number">'+
            '<div class="pl-count">'+
              '<svg fill="#000000" height="20" viewBox="0 0 24 24" width="20" xmlns="http://www.w3.org/2000/svg">'+
                  '<path d="M0 0h24v24H0z" fill="none"/>'+
                  '<path d=""/>'+
              '</svg>'+
            '</div>'+
            '<div class="pl-playing">'+
              '<div class="eq">'+
                '<div class="eq-bar"></div>'+
                '<div class="eq-bar"></div>'+
                '<div class="eq-bar"></div>'+
              '</div>'+
            '</div>'+
          '</div>'+
          '<div class="pl-title">{title}</div>'+
          '<button class="pl-remove">'+
              '<svg fill="#000000" height="20" viewBox="0 0 24 24" width="20" xmlns="http://www.w3.org/2000/svg">'+
                  '<path d=""/>'+
                  '<path d="M0 0h24v24H0z" fill="none"/>'+
              '</svg>'+
          '</button>'+
        '</li>';

      playList.forEach(function(item, i) {
        html.push(
          tpl.replace('{count}', i).replace('{title}', item.title)
        );
      });

      pl = create('div', {
        'className': 'pl-container hide',
        'id': 'pl',
        'innerHTML': !isEmptyList() ? '<ul class="pl-list">' + html.join('') + '</ul>' : '<div class="pl-empty">PlayList is empty</div>'
      });

      player.parentNode.insertBefore(pl, player.nextSibling);

      plLi = pl.querySelectorAll('li');

      pl.addEventListener('click', listHandler, false);
    }

    function listHandler(evt) {
      evt.preventDefault();
      if(evt.target.className === 'pl-title') {
        var current = parseInt(evt.target.parentNode.getAttribute('data-track'), 10);
        index = current;
        play();
        plActive();
      }
      else {
        var target = evt.target;
        while(target.className !== pl.className) {
          if(target.className === 'pl-remove') {
            var isDel = parseInt(target.parentNode.getAttribute('data-track'), 10);

            playList.splice(isDel, 1);
            target.parentNode.parentNode.removeChild(target.parentNode);

            plLi = pl.querySelectorAll('li');

            [].forEach.call(plLi, function(el, i) {
              el.setAttribute('data-track', i);
            });

            if(!audio.paused) {

              if(isDel === index) {
                play();
              }

            }
            else {
              if(isEmptyList()) {
                empty();
              }
              else {
                // audio.currentTime = 0;
                audio.src = playList[index].file;
                document.title = trackTitle.innerHTML = playList[index].title;
                progressBar.style.width = 0;
              }
            }
            if(isDel < index) {
              index--;
            }

            return;
          }
          target = target.parentNode;
        }

      }
    }

    function plActive() {
      if(audio.paused) {
        plLi[index].classList.remove('pl-current');
        return;
      }
      var current = index;
      for(var i = 0, len = plLi.length; len > i; i++) {
        plLi[i].classList.remove('pl-current');
      }
      plLi[current].classList.add('pl-current');
    }


/**
 *  Player methods
 */
  function error() {
    !isEmptyList() && next();
  }
  function play() {

    index = (index > playList.length - 1) ? 0 : index;
    if(index < 0) index = playList.length - 1;

    if(isEmptyList()) {
      empty();
      return;
    }

    audio.src = playList[index].file;
    audio.preload = 'auto';
    document.title = trackTitle.innerHTML = playList[index].title;
    audio.play();
    notify(playList[index].title, {
      icon: playList[index].icon,
      body: 'Now playing',
      tag: 'music-player'
    });
    playBtn.classList.add('playing');
    plActive();
  }

  function prev() {
    index = index - 1;
    play();
  }

  function next() {
    index = index + 1;
    play();
  }

  function isEmptyList() {
    return playList.length === 0;
  }

  function empty() {
    audio.pause();
    audio.src = '';
    trackTitle.innerHTML = 'queue is empty';
    curTime.innerHTML = '--';
    durTime.innerHTML = '--';
    progressBar.style.width = 0;
    preloadBar.style.width = 0;
    playBtn.classList.remove('playing');
    pl.innerHTML = '<div class="pl-empty">PlayList is empty</div>';
  }

  function playToggle() {
    if(isEmptyList()) {
      return;
    }
    if(audio.paused) {
      audio.play();
      notify(playList[index].title, {
        icon: playList[index].icon,
        body: 'Now playing'
      });
      this.classList.add('playing');
    }
    else {
      audio.pause();
      this.classList.remove('playing');
    }
    plActive();
  }

  function volumeToggle() {
    if(audio.muted) {
      if(parseInt(volumeLength, 10) === 0) {
        volumeBar.style.height = '100%';
        audio.volume = 1;
      }
      else {
        volumeBar.style.height = volumeLength;
      }
      audio.muted = false;
      this.classList.remove('muted');
    }
    else {
      audio.muted = true;
      volumeBar.style.height = 0;
      this.classList.add('muted');
    }
  }

  function repeatToggle() {
    var repeat = this.classList;
    if(repeat.contains('ap-active')) {
      repeating = false;
      repeat.remove('ap-active');
    }
    else {
      repeating = true;
      repeat.add('ap-active');
    }
  }

  function plToggle() {
    this.classList.toggle('ap-active');
    pl.classList.toggle('hide');
  }

  function update() {
    if(audio.readyState === 0) return;

    var barlength = Math.round(audio.currentTime * (100 / audio.duration));
    progressBar.style.width = barlength + '%';

    var
    curMins = Math.floor(audio.currentTime / 60),
    curSecs = Math.floor(audio.currentTime - curMins * 60),
    mins = Math.floor(audio.duration / 60),
    secs = Math.floor(audio.duration - mins * 60);
    (curSecs < 10) && (curSecs = '0' + curSecs);
    (secs < 10) && (secs = '0' + secs);

    curTime.innerHTML = curMins + ':' + curSecs;
    durTime.innerHTML = mins + ':' + secs;

    var buffered = audio.buffered;
    if(buffered.length) {
      var loaded = Math.round(100 * buffered.end(0) / audio.duration);
      preloadBar.style.width = loaded + '%';
    }
  }

  function doEnd() {
    if(index === playList.length - 1) {
      if(!repeating) {
        audio.pause();
        plActive();
        playBtn.classList.remove('playing');
        return;
      }
      else {
        index = 0;
        play();
      }
    }
    else {
      index = (index === playList.length - 1) ? 0 : index + 1;
      play();
    }
  }

  function moveBar(evt, el, dir) {
    var value;
    if(dir === 'horizontal') {
      value = Math.round( ((evt.clientX - el.offset().left) + window.pageXOffset) * 100 / el.parentNode.offsetWidth);
      el.style.width = value + '%';
      return value;
    }
    else {
      var offset = (el.offset().top + el.offsetHeight)  - window.pageYOffset;
      value = Math.round((offset - evt.clientY));
      if(value > 100) value = 100;
      if(value < 0) value = 0;
      volumeBar.style.height = value + '%';
      return value;
    }
  }

  function handlerBar(evt) {
    rightClick = (evt.which === 3) ? true : false;
    seeking = true;
    seek(evt);
  }

  function handlerVol(evt) {
    rightClick = (evt.which === 3) ? true : false;
    seeking = true;
    setVolume(evt);
  }

  function seek(evt) {
    if(seeking && rightClick === false && audio.readyState !== 0) {
      var value = moveBar(evt, progressBar, 'horizontal');
      audio.currentTime = audio.duration * (value / 100);
    }
  }

  function seekingFalse() {
    seeking = false;
  }

  function setVolume(evt) {
    volumeLength = volumeBar.css('height');
    if(seeking && rightClick === false) {
      var value = moveBar(evt, volumeBar.parentNode, 'vertical') / 100;
      if(value <= 0) {
        audio.volume = 0;
        volumeBtn.classList.add('muted');
      }
      else {
        if(audio.muted) audio.muted = false;
        audio.volume = value;
        volumeBtn.classList.remove('muted');
      }
    }
  }

  function notify(title, attr) {
    if(!settings.notification) {
      return;
    }
    if(window.Notification === undefined) {
      return;
    }
    window.Notification.requestPermission(function(access) {
      if(access === 'granted') {
        var notice = new Notification(title.substr(0, 110), attr);
        notice.onshow = function() {
          setTimeout(function() {
            notice.close();
          }, 5000);
        }
        // notice.onclose = function() {
        //   if(noticeTimer) {
        //     clearTimeout(noticeTimer);
        //   }
        // }
      }
    })
  }

/* Destroy method. Clear All */
  function destroy() {
    if(!apActive) return;

    playBtn.removeEventListener('click', playToggle, false);
    volumeBtn.removeEventListener('click', volumeToggle, false);
    repeatBtn.removeEventListener('click', repeatToggle, false);
    plBtn.removeEventListener('click', plToggle, false);

    progressBar.parentNode.parentNode.removeEventListener('mousedown', handlerBar, false);
    progressBar.parentNode.parentNode.removeEventListener('mousemove', seek, false);
    document.documentElement.removeEventListener('mouseup', seekingFalse, false);

    volumeBar.parentNode.parentNode.removeEventListener('mousedown', handlerVol, false);
    volumeBar.parentNode.parentNode.removeEventListener('mousemove', setVolume);
    document.documentElement.removeEventListener('mouseup', seekingFalse, false);

    prevBtn.removeEventListener('click', prev, false);
    nextBtn.removeEventListener('click', next, false);

    audio.removeEventListener('error', error, false);
    audio.removeEventListener('timeupdate', update, false);
    audio.removeEventListener('ended', doEnd, false);
    player.parentNode.removeChild(player);

    // Playlist
    pl.removeEventListener('click', listHandler, false);
    pl.parentNode.removeChild(pl);

    audio.pause();
    apActive = false;
  }


/**
 *  Helpers
 */
  function extend(defaults, options) {
    for(var name in options) {
      if(defaults.hasOwnProperty(name)) {
        defaults[name] = options[name];
      }
    }
    return defaults;
  }
  function create(el, attr) {
    var element = document.createElement(el);
    if(attr) {
      for(var name in attr) {
        if(element[name] !== undefined) {
          element[name] = attr[name];
        }
      }
    }
    return element;
  }

  Element.prototype.offset = function() {
    var el = this.getBoundingClientRect(),
    scrollLeft = window.pageXOffset || document.documentElement.scrollLeft,
    scrollTop = window.pageYOffset || document.documentElement.scrollTop;

    return {
      top: el.top + scrollTop,
      left: el.left + scrollLeft
    };
  };

  Element.prototype.css = function(attr) {
    if(typeof attr === 'string') {
      return getComputedStyle(this, '')[attr];
    }
    else if(typeof attr === 'object') {
      for(var name in attr) {
        if(this.style[name] !== undefined) {
          this.style[name] = attr[name];
        }
      }
    }
  };


/**
 *  Public methods
 */
  return {
    init: init,
    destroy: destroy
  };

})();

window.AP = AudioPlayer;

})(window);


// test image for web notifications
var iconImage = 'http://funkyimg.com/i/21pX5.png';

AP.init({
  playList: [
  {'icon': iconImage, 'title': 'الفاتحة', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/001.mp3'},
    {'icon': iconImage, 'title': 'البقرة', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/002.mp3'},
    {'icon': iconImage, 'title': 'آل عمران', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/003.mp3'},
    {'icon': iconImage, 'title': 'النساء', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/004.mp3'},
    {'icon': iconImage, 'title': 'المائدة', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/005.mp3'},
	{'icon': iconImage, 'title': 'الأنعام', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/006.mp3'},
    {'icon': iconImage, 'title': 'الأعراف', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/007.mp3'},
    {'icon': iconImage, 'title': 'الأنفال', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/008.mp3'},
    {'icon': iconImage, 'title': 'التوبة', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/009.mp3'},
{'icon': iconImage, 'title': 'يونس', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/010.mp3'},
{'icon': iconImage, 'title': 'هود', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/011.mp3'},
{'icon': iconImage, 'title': 'يوسف', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/012.mp3'},
{'icon': iconImage, 'title': 'الرعد', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/013.mp3'},
{'icon': iconImage, 'title': 'إبراهيم', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/014.mp3'},
{'icon': iconImage, 'title': 'الحجر', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/015.mp3'},
{'icon': iconImage, 'title': 'النحل', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/016.mp3'},
{'icon': iconImage, 'title': 'الإسراء', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/017.mp3'},
{'icon': iconImage, 'title': 'الكهف', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/018.mp3'},
{'icon': iconImage, 'title': 'مريم', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/019.mp3'},
{'icon': iconImage, 'title': 'طه', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/020.mp3'},
{'icon': iconImage, 'title': 'الأنبياء', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/021.mp3'},
{'icon': iconImage, 'title': 'الحج', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/022.mp3'},
{'icon': iconImage, 'title': 'المؤمنون', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/023.mp3'},
{'icon': iconImage, 'title': 'النور', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/024.mp3'},
{'icon': iconImage, 'title': 'الفرقان', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/025.mp3'},
{'icon': iconImage, 'title': 'الشعراء', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/026.mp3'},
{'icon': iconImage, 'title': 'النمل', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/027.mp3'},
{'icon': iconImage, 'title': 'القصص', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/028.mp3'},
{'icon': iconImage, 'title': 'العنكبوت', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/029.mp3'},
{'icon': iconImage, 'title': 'الروم', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/030.mp3'},
{'icon': iconImage, 'title': 'لقمان', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/031.mp3'},
{'icon': iconImage, 'title': 'السجدة', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/032.mp3'},
{'icon': iconImage, 'title': 'الأحزاب', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/033.mp3'},
{'icon': iconImage, 'title': 'سبأ', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/034.mp3'},
{'icon': iconImage, 'title': 'فاطر', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/035.mp3'},
{'icon': iconImage, 'title': 'يس', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/036.mp3'},
{'icon': iconImage, 'title': 'الصافات', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/037.mp3'},
{'icon': iconImage, 'title': 'ص', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/038.mp3'},
{'icon': iconImage, 'title': 'الزمر', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/039.mp3'},
{'icon': iconImage, 'title': 'غافر', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/040.mp3'},
{'icon': iconImage, 'title': 'فصلت', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/041.mp3'},
{'icon': iconImage, 'title': 'الشورى', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/042.mp3'},
{'icon': iconImage, 'title': 'الزخرف', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/043.mp3'},
{'icon': iconImage, 'title': 'الدخان', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/044.mp3'},
{'icon': iconImage, 'title': 'الجاثية', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/045.mp3'},
{'icon': iconImage, 'title': 'الأحقاف', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/046.mp3'},
{'icon': iconImage, 'title': 'محمد', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/047.mp3'},
{'icon': iconImage, 'title': 'الفتح', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/048.mp3'},
{'icon': iconImage, 'title': 'الحجرات', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/049.mp3'},
{'icon': iconImage, 'title': 'ق', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/050.mp3'},
{'icon': iconImage, 'title': 'الذاريات', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/051.mp3'},
{'icon': iconImage, 'title': 'الطور', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/052.mp3'},
{'icon': iconImage, 'title': 'النجم', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/053.mp3'},
{'icon': iconImage, 'title': 'القمر', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/054.mp3'},
{'icon': iconImage, 'title': 'الرحمن', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/055.mp3'},
{'icon': iconImage, 'title': 'الواقعة', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/056.mp3'},
{'icon': iconImage, 'title': 'الحديد', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/057.mp3'},
{'icon': iconImage, 'title': 'المجادلة', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/058.mp3'},
{'icon': iconImage, 'title': 'الحشر', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/059.mp3'},
{'icon': iconImage, 'title': 'الممتحنة', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/060.mp3'},
{'icon': iconImage, 'title': 'الصف', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/061.mp3'},
{'icon': iconImage, 'title': 'الجمعة', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/062.mp3'},
{'icon': iconImage, 'title': 'المنافقون', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/063.mp3'},
{'icon': iconImage, 'title': 'التغابن', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/064.mp3'},
{'icon': iconImage, 'title': 'الطلاق', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/065.mp3'},
{'icon': iconImage, 'title': 'التحريم', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/066.mp3'},
{'icon': iconImage, 'title': 'الملك', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/067.mp3'},
{'icon': iconImage, 'title': 'القلم', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/068.mp3'},
{'icon': iconImage, 'title': 'الحاقة', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/069.mp3'},
{'icon': iconImage, 'title': 'المعارج', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/070.mp3'},
{'icon': iconImage, 'title': 'نوح', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/071.mp3'},
{'icon': iconImage, 'title': 'الجن', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/072.mp3'},
{'icon': iconImage, 'title': 'المزمل', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/073.mp3'},
{'icon': iconImage, 'title': 'المدثر', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/074.mp3'},
{'icon': iconImage, 'title': 'القيامة', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/075.mp3'},
{'icon': iconImage, 'title': 'الإنسان', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/076.mp3'},
{'icon': iconImage, 'title': 'المرسلات', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/077.mp3'},
{'icon': iconImage, 'title': 'النباء', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/078.mp3'},
{'icon': iconImage, 'title': 'النازعات', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/079.mp3'},
{'icon': iconImage, 'title': 'عبس', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/080.mp3'},
{'icon': iconImage, 'title': 'التكوير', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/081.mp3'},
{'icon': iconImage, 'title': 'الانفطار', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/082.mp3'},
{'icon': iconImage, 'title': 'المطففين', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/083.mp3'},
{'icon': iconImage, 'title': 'الإنشقاق', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/084.mp3'},
{'icon': iconImage, 'title': 'البروج', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/085.mp3'},
{'icon': iconImage, 'title': 'الطارق', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/086.mp3'},
{'icon': iconImage, 'title': 'الأعلى', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/087.mp3'},
{'icon': iconImage, 'title': 'الغاشية', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/088.mp3'},
{'icon': iconImage, 'title': 'الفجر', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/089.mp3'},
{'icon': iconImage, 'title': 'البلد', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/090.mp3'},
{'icon': iconImage, 'title': 'الشمس', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/091.mp3'},
{'icon': iconImage, 'title': 'الليل', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/092.mp3'},
{'icon': iconImage, 'title': 'الضحى', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/093.mp3'},
{'icon': iconImage, 'title': 'الشرح', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/094.mp3'},
{'icon': iconImage, 'title': 'التين', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/095.mp3'},
{'icon': iconImage, 'title': 'العلق', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/096.mp3'},
{'icon': iconImage, 'title': 'القدر', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/097.mp3'},
{'icon': iconImage, 'title': 'البينة', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/098.mp3'},
{'icon': iconImage, 'title': 'الزلزلة', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/099.mp3'},
{'icon': iconImage, 'title': 'العاديات', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/100.mp3'},
{'icon': iconImage, 'title': 'القارعة', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/101.mp3'},
{'icon': iconImage, 'title': 'التكاثر', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/102.mp3'},
{'icon': iconImage, 'title': 'العصر', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/103.mp3'},
{'icon': iconImage, 'title': 'الهمزة', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/104.mp3'},
{'icon': iconImage, 'title': 'الفيل', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/105.mp3'},
{'icon': iconImage, 'title': 'قريش', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/106.mp3'},
{'icon': iconImage, 'title': 'الماعون', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/107.mp3'},
{'icon': iconImage, 'title': 'الكوثر', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/108.mp3'},
{'icon': iconImage, 'title': 'الكافرون', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/109.mp3'},
{'icon': iconImage, 'title': 'النصر', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/110.mp3'},
{'icon': iconImage, 'title': 'المسد', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/111.mp3'},
{'icon': iconImage, 'title': 'الإخلاص', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/112.mp3'},
{'icon': iconImage, 'title': 'الفلق', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/113.mp3'},
{'icon': iconImage, 'title': 'الناس', 'file': 'http://download.tvquran.com/download/TvQuran.com__Maher/114.mp3'},


  ]
});
	