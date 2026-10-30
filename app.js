/* Shared behavior for Alpine Ascents pages. */
(function () {
  'use strict';

  var mainNav = document.getElementById('mainNav');
  var menuToggle = document.getElementById('menuToggle');
  var dropToggle = document.getElementById('dropToggle');
  var dropItem = dropToggle ? dropToggle.parentNode : null;
  var localProfile = null;
  var profileDialog = null;

  function readStoredProfile() {
    try {
      var storedProfile = window.localStorage.getItem('aaDemoProfile');
      return storedProfile ? JSON.parse(storedProfile) : null;
    } catch (error) {
      return null;
    }
  }

  function readLocalProfile() {
    var storedProfile = readStoredProfile();
    var signedInEmail = '';
    try { signedInEmail = window.sessionStorage.getItem('aaDemoSignedIn') || ''; } catch (error) { signedInEmail = ''; }
    localProfile = storedProfile && storedProfile.email === signedInEmail ? storedProfile : null;
    return localProfile;
  }

  async function hashProfilePassword(email, password, salt) {
    var passwordKey = await window.crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(email + ':' + password),
      'PBKDF2',
      false,
      ['deriveBits']
    );
    var digest = await window.crypto.subtle.deriveBits({
      name: 'PBKDF2',
      salt: new TextEncoder().encode(salt),
      iterations: 120000,
      hash: 'SHA-256'
    }, passwordKey, 256);
    return Array.prototype.map.call(new Uint8Array(digest), function (byte) {
      return byte.toString(16).padStart(2, '0');
    }).join('');
  }

  function openProfileDialog(view) {
    if (!profileDialog) { return; }
    if (localProfile) {
      profileDialog.querySelector('.profile-signed-in').hidden = false;
      profileDialog.querySelector('.profile-forms').hidden = true;
      profileDialog.querySelector('.profile-welcome').textContent = 'Signed in on this device as ' + localProfile.name + ' (' + localProfile.email + ').';
    } else {
      profileDialog.querySelector('.profile-signed-in').hidden = true;
      profileDialog.querySelector('.profile-forms').hidden = false;
      setProfileView(view || 'signin');
    }
    profileDialog.showModal();
  }

  function setProfileView(view) {
    if (!profileDialog) { return; }
    var showSignup = view === 'signup';
    profileDialog.querySelector('#profileSignup').hidden = !showSignup;
    profileDialog.querySelector('#profileSignin').hidden = showSignup;
    profileDialog.querySelector('[data-profile-view="signup"]').setAttribute('aria-pressed', showSignup ? 'true' : 'false');
    profileDialog.querySelector('[data-profile-view="signin"]').setAttribute('aria-pressed', showSignup ? 'false' : 'true');
    profileDialog.querySelector('.profile-message').textContent = '';
  }

  function refreshPlannerSaveControls() {
    var plannerForm = document.getElementById('plannerForm');
    var plannerResult = document.getElementById('plannerResult');
    if (!plannerForm || !plannerResult) { return; }

    var existingControl = document.getElementById('loadSavedPlan');
    var savedPlan = null;
    try {
      savedPlan = JSON.parse(window.localStorage.getItem('aaSavedChecklist') || 'null');
    } catch (error) {
      savedPlan = null;
    }
    if (!localProfile || !savedPlan || savedPlan.email !== localProfile.email) {
      if (existingControl) { existingControl.parentNode.remove(); }
      return;
    }

    if (existingControl) { return; }
    var savedPlanBanner = document.createElement('div');
    savedPlanBanner.className = 'planner-saved-plan';
    var savedPlanMessage = document.createElement('p');
    savedPlanMessage.textContent = 'You have a checklist saved on this device.';
    var loadButton = document.createElement('button');
    loadButton.type = 'button';
    loadButton.id = 'loadSavedPlan';
    loadButton.textContent = 'Load saved checklist';
    loadButton.addEventListener('click', function () {
      var latestPlan;
      try { latestPlan = JSON.parse(window.localStorage.getItem('aaSavedChecklist') || 'null'); } catch (error) { latestPlan = null; }
      if (!latestPlan || latestPlan.email !== localProfile.email) { return; }
      plannerForm.elements.terrain.value = latestPlan.terrain;
      plannerForm.elements.experience.value = latestPlan.experience;
      plannerForm.requestSubmit();
      var checklistItems = plannerResult.querySelectorAll('input[type="checkbox"]');
      for (var checkIndex = 0; checkIndex < checklistItems.length; checkIndex++) {
        checklistItems[checkIndex].checked = Boolean(latestPlan.checked[checkIndex]);
      }
    });
    savedPlanBanner.appendChild(savedPlanMessage);
    savedPlanBanner.appendChild(loadButton);
    plannerForm.parentNode.insertBefore(savedPlanBanner, plannerResult);
  }

  function refreshSavedQuizScore() {
    var scoreElement = document.getElementById('challengeScore');
    if (!scoreElement) { return; }
    if (!localProfile) {
      scoreElement.textContent = '';
      return;
    }
    try {
      var savedScore = JSON.parse(window.localStorage.getItem('aaBestQuiz') || 'null');
      if (savedScore && savedScore.email === localProfile.email) {
        scoreElement.textContent = 'Best saved score: ' + savedScore.score + ' / ' + savedScore.total + '.';
      }
    } catch (error) {
      scoreElement.textContent = '';
    }
  }

  function initializeLocalProfile() {
    var headerInner = document.querySelector('.header-inner');
    var themeToggle = document.querySelector('.theme-toggle');
    if (!headerInner || !themeToggle) { return; }

    var headerTools = document.createElement('div');
    headerTools.className = 'header-tools';
    headerInner.insertBefore(headerTools, themeToggle);
    headerTools.appendChild(themeToggle);

    var profileButton = document.createElement('button');
    profileButton.type = 'button';
    profileButton.className = 'account-toggle';
    profileButton.setAttribute('aria-label', 'Open local profile');
    profileButton.title = 'Local profile';
    profileButton.innerHTML = '<span class="account-icon" aria-hidden="true"></span>';
    headerTools.appendChild(profileButton);

    profileDialog = document.createElement('dialog');
    profileDialog.className = 'profile-dialog';
    profileDialog.setAttribute('aria-labelledby', 'profileTitle');
    profileDialog.innerHTML = '<div class="profile-dialog-header"><div><p class="section-kicker">YOUR FIELD NOTES</p><h2 id="profileTitle">Local profile</h2><p class="profile-subtitle">Save your checklist and keep your best field-decision score on this device.</p></div><button class="profile-close" type="button" aria-label="Close profile">&times;</button></div>' +
      '<div class="profile-signed-in" hidden><p class="profile-welcome"></p><button class="profile-signout" type="button">Sign out on this device</button></div>' +
      '<div class="profile-forms"><div class="profile-tabs" role="group" aria-label="Profile options"><button type="button" data-profile-view="signin" aria-pressed="true">Sign in</button><button type="button" data-profile-view="signup" aria-pressed="false">Create profile</button></div>' +
      '<form id="profileSignin"><label>Email<input name="email" type="email" autocomplete="email" required></label><label>Password<input name="password" type="password" autocomplete="current-password" required></label><button class="planner-submit" type="submit">Sign in</button></form>' +
      '<form id="profileSignup" hidden><label>Name<input name="name" type="text" autocomplete="name" maxlength="60" required></label><label>Email<input name="email" type="email" autocomplete="email" required></label><label>Password<input name="password" type="password" autocomplete="new-password" minlength="8" required><small>Use at least 8 characters.</small></label><button class="planner-submit" type="submit">Create local profile</button></form>' +
      '<p class="profile-message" role="status" aria-live="polite"></p></div>' +
      '<p class="profile-note">Class demo only: your name, email, and a password hash stay in this browser. This is not secure account authentication and does not sync. Do not reuse a real password or enter sensitive information.</p>';
    document.body.appendChild(profileDialog);

    profileButton.addEventListener('click', function () { openProfileDialog('signin'); });
    profileDialog.querySelector('.profile-close').addEventListener('click', function () { profileDialog.close(); });
    profileDialog.addEventListener('click', function (event) {
      if (event.target === profileDialog) { profileDialog.close(); }
    });
    profileDialog.querySelectorAll('[data-profile-view]').forEach(function (tab) {
      tab.addEventListener('click', function () { setProfileView(this.getAttribute('data-profile-view')); });
    });
    profileDialog.querySelector('#profileSignup').addEventListener('submit', async function (event) {
      event.preventDefault();
      var formData = new FormData(this);
      try {
        if (!window.crypto || !window.crypto.subtle) { throw new Error('Password hashing is unavailable.'); }
        var email = String(formData.get('email')).trim().toLowerCase();
        var saltBytes = window.crypto.getRandomValues(new Uint8Array(16));
        var salt = Array.prototype.map.call(saltBytes, function (byte) { return byte.toString(16).padStart(2, '0'); }).join('');
        localProfile = {
          name: String(formData.get('name')).trim(),
          email: email,
          passwordSalt: salt,
          passwordHash: await hashProfilePassword(email, String(formData.get('password')), salt)
        };
        window.localStorage.setItem('aaDemoProfile', JSON.stringify(localProfile));
        window.sessionStorage.setItem('aaDemoSignedIn', localProfile.email);
        profileDialog.close();
        refreshPlannerSaveControls();
        refreshSavedQuizScore();
      } catch (error) {
        localProfile = null;
        profileDialog.querySelector('.profile-message').textContent = 'Could not create the profile. This browser may not support password hashing or local storage.';
      }
    });
    profileDialog.querySelector('#profileSignin').addEventListener('submit', async function (event) {
      event.preventDefault();
      var formData = new FormData(this);
      var email = String(formData.get('email')).trim().toLowerCase();
      var storedProfile = readStoredProfile();
      if (!storedProfile || storedProfile.email !== email) {
        profileDialog.querySelector('.profile-message').textContent = 'No saved profile matches that email on this device. Create a profile here first.';
        return;
      }
      try {
        if (!storedProfile.passwordSalt || !storedProfile.passwordHash) {
          profileDialog.querySelector('.profile-message').textContent = 'This older profile has no password. Create a new local profile to use password sign-in.';
          return;
        }
        var passwordHash = await hashProfilePassword(email, String(formData.get('password')), storedProfile.passwordSalt);
        if (passwordHash !== storedProfile.passwordHash) {
          profileDialog.querySelector('.profile-message').textContent = 'That password does not match this local profile.';
          return;
        }
        window.sessionStorage.setItem('aaDemoSignedIn', storedProfile.email);
      } catch (error) {
        profileDialog.querySelector('.profile-message').textContent = 'Could not check the password in this browser.';
        return;
      }
      localProfile = storedProfile;
      profileDialog.close();
      refreshPlannerSaveControls();
      refreshSavedQuizScore();
    });
    profileDialog.querySelector('.profile-signout').addEventListener('click', function () {
      try { window.sessionStorage.removeItem('aaDemoSignedIn'); } catch (error) { /* Storage may be unavailable. */ }
      localProfile = null;
      profileDialog.close();
      openProfileDialog('signin');
      refreshPlannerSaveControls();
      refreshSavedQuizScore();
    });
    profileDialog.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') { profileDialog.close(); }
    });

    readLocalProfile();
  }

  function initializeThemeToggle() {
    var headerInner = document.querySelector('.header-inner');
    var visitorBox = document.querySelector('.visitor-box');
    if (!headerInner || !visitorBox) { return; }

    var isDarkMode = false;
    try {
      isDarkMode = window.localStorage.getItem('aaTheme') === 'dark';
    } catch (error) {
      console.error('Unable to read theme preference:', error);
    }

    var themeToggle = document.createElement('button');
    themeToggle.type = 'button';
    themeToggle.className = 'theme-toggle';
    themeToggle.setAttribute('aria-pressed', 'false');
    themeToggle.innerHTML = '<span class="theme-toggle-icon" aria-hidden="true"></span><span class="theme-toggle-label"></span>';
    headerInner.insertBefore(themeToggle, visitorBox);
    if (mainNav) { mainNav.appendChild(visitorBox); }

    var themeLabel = themeToggle.querySelector('.theme-toggle-label');

    function applyTheme() {
      document.body.classList.toggle('dark-mode', isDarkMode);
      themeToggle.setAttribute('aria-pressed', isDarkMode ? 'true' : 'false');
      themeToggle.setAttribute('aria-label', 'Switch to ' + (isDarkMode ? 'light' : 'dark') + ' mode');
      themeToggle.title = 'Switch to ' + (isDarkMode ? 'light' : 'dark') + ' mode';
      themeLabel.textContent = isDarkMode ? 'Light mode' : 'Dark mode';
    }

    themeToggle.addEventListener('click', function () {
      isDarkMode = !isDarkMode;
      applyTheme();
      try {
        window.localStorage.setItem('aaTheme', isDarkMode ? 'dark' : 'light');
      } catch (error) {
        console.error('Unable to save theme preference:', error);
      }
    });

    applyTheme();
  }

  function updateCurrentPage() {
    var currentFile = window.location.pathname.split('/').pop() || 'index.html';
    var links = document.querySelectorAll('[data-nav-page]');
    for (var i = 0; i < links.length; i++) {
      var isCurrent = links[i].getAttribute('data-nav-page') === currentFile;
      if (isCurrent) {
        links[i].className += ' active';
        links[i].setAttribute('aria-current', 'page');
      } else {
        links[i].className = links[i].className.replace(/\s*active/g, '');
        links[i].removeAttribute('aria-current');
      }
    }
  }

  function initializePageTransitions() {
    var navigating = false;

    document.addEventListener('click', function (event) {
      if (event.defaultPrevented || event.button !== 0 ||
          event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) { return; }

      var link = event.target.closest ? event.target.closest('a[href]') : null;
      if (!link || link.target && link.target !== '_self' || link.hasAttribute('download')) { return; }

      var destination = new URL(link.href, window.location.href);
      if (destination.origin !== window.location.origin ||
          (destination.pathname === window.location.pathname &&
           destination.search === window.location.search)) { return; }

      event.preventDefault();
      if (navigating) { return; }
      navigating = true;
      document.body.classList.add('page-exit');
      window.setTimeout(function () {
        window.location.assign(destination.href);
      }, 280);
    });
  }

  function closeMobileMenu() {
    if (mainNav) { mainNav.className = mainNav.className.replace(/\s*open/g, ''); }
    if (menuToggle) { menuToggle.setAttribute('aria-expanded', 'false'); }
    if (dropItem) { dropItem.className = dropItem.className.replace(/\s*open/g, ''); }
  }

  initializeThemeToggle();
  initializeLocalProfile();
  updateCurrentPage();
  initializePageTransitions();

  if (dropToggle && dropItem) {
    dropToggle.addEventListener('click', function (event) {
      if (window.matchMedia('(max-width: 1320px)').matches) {
        if (dropItem.className.indexOf('open') === -1) {
          event.preventDefault();
          dropItem.className += ' open';
        } else {
          closeMobileMenu();
        }
      }
    });

    document.addEventListener('click', function (event) {
      if (!dropItem.contains(event.target) && window.matchMedia('(max-width: 1320px)').matches) {
        dropItem.className = dropItem.className.replace(/\s*open/g, '');
      }
    });
  }

  if (menuToggle && mainNav) {
    menuToggle.addEventListener('click', function () {
      var isOpen = mainNav.className.indexOf('open') !== -1;
      if (isOpen) {
        closeMobileMenu();
      } else {
        mainNav.className += ' open';
        menuToggle.setAttribute('aria-expanded', 'true');
      }
    });

    var pageLinks = mainNav.querySelectorAll('a[href]');
    for (var linkIndex = 0; linkIndex < pageLinks.length; linkIndex++) {
      pageLinks[linkIndex].addEventListener('click', function () {
        if (this !== dropToggle || !window.matchMedia('(max-width: 1320px)').matches) {
          closeMobileMenu();
        }
      });
    }
  }

  function updateVisitCount() {
    var countElement = document.getElementById('visitorCount');
    if (!countElement) { return; }

    var count = 0;
    try {
      count = parseInt(window.localStorage.getItem('aaVisitors'), 10) || 0;
      if (!window.sessionStorage.getItem('aaCounted')) {
        count += 1;
        window.localStorage.setItem('aaVisitors', String(count));
        window.sessionStorage.setItem('aaCounted', '1');
      }
    } catch (error) {
      count = 1;
    }
    countElement.textContent = String(count).padStart(4, '0');
  }

  function initializeScrollAnimations() {
    var main = document.querySelector('main');
    if (!main || !('IntersectionObserver' in window)) { return; }

    var targets = main.querySelectorAll([
      ':scope > *',
      'section > *',
      '.page-heading > *',
      'article',
      'figure',
      'aside',
      '.club-layout > *',
      '.guideline-layout > *',
      '.video-resources > *',
      '.hero-copy > *',
      '.hero-index',
      '.intro-grid > *',
      '.section-heading > *',
      '.explore-item',
      '.principles-inner > *'
    ].join(','));
    if (!targets.length) { return; }

    var observer = new IntersectionObserver(function (entries) {
      for (var entryIndex = 0; entryIndex < entries.length; entryIndex++) {
        if (entries[entryIndex].isIntersecting) {
          entries[entryIndex].target.classList.add('is-visible');
          observer.unobserve(entries[entryIndex].target);
        }
      }
    }, { threshold: 0, rootMargin: '0px 0px -6% 0px' });

    for (var targetIndex = 0; targetIndex < targets.length; targetIndex++) {
      targets[targetIndex].classList.add('scroll-reveal');
      targets[targetIndex].style.setProperty('--reveal-delay', Math.min(targetIndex, 4) * 70 + 'ms');
      observer.observe(targets[targetIndex]);
    }
    document.documentElement.classList.add('motion-ready');
  }

  var locationText = 'Location unavailable';
  var tickerElement = document.getElementById('tickerText');

  function updateTicker() {
    if (!tickerElement) { return; }
    var now = new Date();
    var dateText = new Intl.DateTimeFormat(undefined, {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    }).format(now);
    var timeText = new Intl.DateTimeFormat(undefined, {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).format(now);
    tickerElement.textContent = 'Alpine Ascents  |  Date: ' + dateText +
      '  |  Time: ' + timeText + '  |  Location: ' + locationText;
  }

  function detectLocation() {
    if (!navigator.geolocation) {
      locationText = 'Geolocation not supported';
      updateTicker();
      return;
    }
    try {
      navigator.geolocation.getCurrentPosition(function (position) {
        locationText = position.coords.latitude.toFixed(2) + ', ' +
          position.coords.longitude.toFixed(2);
        updateTicker();
      }, function (error) {
        if (error.code === error.PERMISSION_DENIED) {
          locationText = 'Location permission denied';
        } else if (error.code === error.TIMEOUT) {
          locationText = 'Location request timed out';
        } else {
          locationText = 'Location unavailable';
        }
        updateTicker();
      }, { timeout: 10000, maximumAge: 300000 });
    } catch (error) {
      console.error('Unable to request location:', error);
      locationText = 'Location unavailable';
      updateTicker();
    }
  }

  var clubData = {
    aac: { name: 'American Alpine Club', city: 'Golden, Colorado', coords: [39.755, -105.221] },
    mountaineers: { name: 'The Mountaineers', city: 'Seattle, Washington', coords: [47.634, -122.322] },
    'alpine-canada': { name: 'Alpine Club of Canada', city: 'Canmore, Alberta', coords: [51.089, -115.359] },
    bmc: { name: 'British Mountaineering Council', city: 'Manchester, England', coords: [53.481, -2.243] },
    hmi: { name: 'Himalayan Mountaineering Institute', city: 'Darjeeling, India', coords: [27.039, 88.264] }
  };

  function initializeClubMap() {
    var mapElement = document.getElementById('clubMap');
    if (!mapElement) { return; }
    if (!window.L) {
      mapElement.textContent = 'Interactive map unavailable. Organization names and home cities are listed alongside.';
      return;
    }

    var map = window.L.map(mapElement, { scrollWheelZoom: false }).setView([39, -20], 2);
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    var markers = {};
    function selectClub(id, centerMap) {
      var choices = document.querySelectorAll('.club-choice');
      for (var i = 0; i < choices.length; i++) {
        var selected = choices[i].getAttribute('data-club-id') === id;
        choices[i].className = selected ? 'club-choice active' : 'club-choice';
        choices[i].setAttribute('aria-pressed', selected ? 'true' : 'false');
      }
      for (var markerId in markers) {
        if (!Object.prototype.hasOwnProperty.call(markers, markerId)) { continue; }
        var activeMarker = markerId === id;
        markers[markerId].setStyle({
          color: activeMarker ? '#d28b42' : '#277f9d',
          fillColor: activeMarker ? '#d28b42' : '#5eabc2',
          radius: activeMarker ? 9 : 7
        });
      }
      if (centerMap && markers[id]) {
        map.setView(clubData[id].coords, 6);
        markers[id].openPopup();
      }
    }

    var coordinates = [];
    for (var id in clubData) {
      if (!Object.prototype.hasOwnProperty.call(clubData, id)) { continue; }
      (function (clubId) {
        var club = clubData[clubId];
        var marker = window.L.circleMarker(club.coords, {
          radius: 7, color: '#277f9d', weight: 2, fillColor: '#5eabc2', fillOpacity: 1
        }).addTo(map);
        marker.bindPopup('<strong>' + club.name + '</strong><br>' + club.city);
        marker.on('click', function () { selectClub(clubId, false); });
        markers[clubId] = marker;
        coordinates.push(club.coords);
      })(id);
    }
    if (coordinates.length) { map.fitBounds(coordinates, { padding: [24, 24] }); }

    var clubChoices = document.querySelectorAll('.club-choice');
    for (var choiceIndex = 0; choiceIndex < clubChoices.length; choiceIndex++) {
      clubChoices[choiceIndex].setAttribute('aria-pressed', 'false');
      clubChoices[choiceIndex].addEventListener('click', function () {
        selectClub(this.getAttribute('data-club-id'), true);
      });
    }
    selectClub('aac', false);
    window.setTimeout(function () { map.invalidateSize(); }, 100);
  }

  function initializeClimbPlanner() {
    var plannerForm = document.getElementById('plannerForm');
    var plannerResult = document.getElementById('plannerResult');
    if (!plannerForm || !plannerResult) { return; }

    var terrainPrompts = {
      trail: ['Check trail access, permits, and recent reports.', 'Pack navigation, water, food, layers, first aid, and a headlamp.'],
      scramble: ['Confirm route grade, exposure, escape options, and rock conditions.', 'Bring a helmet and route-appropriate footwear; use technical equipment only with training.'],
      snow: ['Review local avalanche and glacier information; avoid hazardous terrain without formal training.', 'Use snow or glacier equipment only with current training and a practiced team.']
    };
    var experiencePrompts = {
      new: 'Choose a conservative objective within your current skills; consider a qualified guide or course.',
      some: 'Identify which skills need refreshing and choose a route with clear escape options.',
      experienced: 'Recheck team readiness, equipment condition, and objective-specific skills before departure.'
    };

    function buildChecklist(terrain, experience) {
      var prompts = [
        experiencePrompts[experience],
        terrainPrompts[terrain][0],
        terrainPrompts[terrain][1],
        'Check more than one current forecast and agree on conditions that mean turning back.',
        'Share the route, expected return time, and overdue plan with a trusted contact.',
        'Set a turnaround time and identify exit routes before starting.'
      ];

      plannerResult.innerHTML = '<div class="planner-result-heading"><div><span class="section-kicker">YOUR STARTING CHECKLIST</span><h3>Before you leave</h3></div><div class="planner-result-actions"><button class="planner-save" type="button">Save checklist</button><button class="planner-print" type="button" aria-label="Print checklist" title="Print checklist">&#9113;</button></div></div><ul>' +
        prompts.map(function (prompt) {
          return '<li><label><input type="checkbox"> <span>' + prompt + '</span></label></li>';
        }).join('') +
        '</ul><p class="planner-result-note">Reassess as conditions change. Turning around is always an option.</p><p class="planner-save-status" role="status" aria-live="polite"></p>';
      plannerResult.hidden = false;
      plannerResult.querySelector('.planner-print').addEventListener('click', function () {
        window.print();
      });
      plannerResult.querySelector('.planner-save').addEventListener('click', function () {
        if (!localProfile) {
          plannerResult.querySelector('.planner-save-status').textContent = 'Create a local profile to save this checklist on this device.';
          openProfileDialog('signup');
          return;
        }
        var checks = plannerResult.querySelectorAll('input[type="checkbox"]');
        var checked = [];
        for (var checkIndex = 0; checkIndex < checks.length; checkIndex++) {
          checked.push(checks[checkIndex].checked);
        }
        try {
          window.localStorage.setItem('aaSavedChecklist', JSON.stringify({
            email: localProfile.email,
            terrain: terrain,
            experience: experience,
            checked: checked
          }));
          plannerResult.querySelector('.planner-save-status').textContent = 'Checklist saved on this device.';
          refreshPlannerSaveControls();
        } catch (error) {
          plannerResult.querySelector('.planner-save-status').textContent = 'Could not save. Check this browser’s storage settings.';
        }
      });
      refreshPlannerSaveControls();
    }

    plannerForm.addEventListener('submit', function (event) {
      event.preventDefault();
      var formData = new FormData(plannerForm);
      buildChecklist(formData.get('terrain'), formData.get('experience'));
      plannerResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    refreshPlannerSaveControls();
  }

  function initializeDecisionChallenge() {
    var challengeForm = document.getElementById('challengeForm');
    var challengeScore = document.getElementById('challengeScore');
    if (!challengeForm || !challengeScore) { return; }

    challengeForm.addEventListener('submit', function (event) {
      event.preventDefault();
      var questions = challengeForm.querySelectorAll('.challenge-question');
      var score = 0;
      var answered = 0;

      for (var questionIndex = 0; questionIndex < questions.length; questionIndex++) {
        var question = questions[questionIndex];
        var selected = question.querySelector('input:checked');
        var explanation = question.querySelector('.challenge-explanation');
        if (!selected) {
          explanation.textContent = 'Choose one response to see the explanation.';
          explanation.className = 'challenge-explanation is-unanswered';
          continue;
        }

        answered += 1;
        var isCorrect = selected.value === question.getAttribute('data-answer');
        if (isCorrect) { score += 1; }
        explanation.textContent = isCorrect ? explanation.getAttribute('data-correct') : explanation.getAttribute('data-incorrect');
        explanation.className = isCorrect ? 'challenge-explanation is-correct' : 'challenge-explanation is-incorrect';
      }

      challengeScore.textContent = answered === questions.length ?
        'Score: ' + score + ' / ' + questions.length :
        'Answered ' + answered + ' of ' + questions.length + ' scenarios. Complete the rest to get your score.';
      if (answered === questions.length && localProfile) {
        try {
          var previousScore = JSON.parse(window.localStorage.getItem('aaBestQuiz') || 'null');
          if (!previousScore || previousScore.email !== localProfile.email || score > previousScore.score) {
            window.localStorage.setItem('aaBestQuiz', JSON.stringify({
              email: localProfile.email,
              score: score,
              total: questions.length
            }));
            challengeScore.textContent += ' Best score saved on this device.';
          } else {
            challengeScore.textContent += ' Best saved score: ' + previousScore.score + ' / ' + previousScore.total + '.';
          }
        } catch (error) {
          challengeScore.textContent += ' Score shown but not saved.';
        }
      }
    });
  }

  updateVisitCount();
  initializeClimbPlanner();
  initializeDecisionChallenge();
  refreshSavedQuizScore();
  initializeScrollAnimations();
  updateTicker();
  window.setInterval(updateTicker, 1000);
  detectLocation();
  initializeClubMap();
})();