var H5P = H5P || {};

/**
 * Guess the answer module
 */
H5P.GuessTheAnswer = (function () {
  /**
   * Triggers 'resize' event on an instance. Stops infinite loops
   * by not re-triggering the event, when it comes from a sibling
   *
   * @param {object} siblingInstance
   * @return {Function}
   */
  function triggerResize(siblingInstance) {
    return function (event) {
      var fromSibling = event.data && (event.data.fromSibling === true);

      if (!fromSibling) {
        siblingInstance.trigger('resize', { fromSibling: true });
      }
    };
  }

  /**
   * Create the media element
   *
   * @param {object} params
   * @param {number} contentId
   * @param {object} instance
   * @return {Element}
   */
  function createMediaElement(params, contentId, instance) {
    var element = document.createElement('div');
    var mediaInstance = H5P.newRunnable(params, contentId, H5P.jQuery(element), true);

    // Resize this instance, on video resize, and vise versa
    instance.on('resize', triggerResize(mediaInstance));
    mediaInstance.on('resize', triggerResize(instance));

    return element;
  }

  /**
   * Initializes the image
   *
   * @param {Element} imageElement
   * @param {object} instance
   */
  function initImage(imageElement, instance) {
    // if has image, resize on load
    if (imageElement) {
      imageElement.style.width = null;
      imageElement.style.height = null;
      imageElement.addEventListener('load', function () {
        instance.trigger('resize');
      }, false);
    }
  }

  /**
   * Simple recusive function the helps set default values without
   * destroying object references.
   *
   * Note: Can be removed if 'babel-plugin-transform-object-assign' is added
   *
   * @param {object} params values
   * @param {object} values default values
   */
  function setDefaults(params, values) {
    params = params || {};
    for (var prop in values) {
      if (Object.prototype.hasOwnProperty.call(values, prop)) {
        if (params[prop] === undefined) {
          params[prop] = values[prop];
        }
        else if (params[prop] instanceof Object && !(params[prop] instanceof Array)) {
          setDefaults(params[prop], values[prop]);
        }
      }
    }
    return params;
  }

  /**
   * Initialize module.
   *
   * @class
   * @alias H5P.GuessTheAnswer
   * @param {object} params
   * @param {number} contentId
   * @param {object} contentData
   */
  function C(params, contentId, contentData) {
    if (!(this instanceof H5P.GuessTheAnswer)) {
      return new H5P.GuessTheAnswer(params, contentId, contentData);
    }

    H5P.Question.call(this, 'guess-the-answer');

    var self = this;

    contentData = contentData || {};
    var prev = contentData.previousState || {};

    // Set default behavior.
    params = setDefaults(params, {
      taskDescription: '',
      solutionLabel: 'Click to see the answer.',
      solutionText: '',
      media: {}
    });

    this.params = params;
    this.contentId = contentId;

    this.answered = !!prev.answered;
    this.showingSolution = !!prev.showingSolution;

    // Build DOM
    this.rootElement = this.createRootElement(params);

    // Add media
    var mediaElement = this.rootElement.querySelector('.media');
    if (params.media && params.media.library) {
      var el = createMediaElement(params.media, contentId, this);
      initImage(el.querySelector('img'), this);
      mediaElement.appendChild(el);
    }
    else if (params.media && params.media.params && Object.keys(params.media.params).length > 0) {
      // Fallback
      var el2 = createMediaElement(params.media, contentId, this);
      initImage(el2.querySelector('img'), this);
      mediaElement.appendChild(el2);
    }

    // Wire button
    var buttonElement = this.rootElement.querySelector('.show-solution-button');
    var solutionElement = this.rootElement.querySelector('.solution-text');

    // Restore state
    if (this.showingSolution || this.answered) {
      this.answered = true;
      this.showingSolution = true;
      buttonElement.classList.add('hidden');
      solutionElement.classList.remove('hidden');
      solutionElement.innerHTML = params.solutionText;
    }

    buttonElement.addEventListener('click', function () {
      buttonElement.classList.add('hidden');
      solutionElement.classList.remove('hidden');
      solutionElement.innerHTML = params.solutionText;

      self.answered = true;
      self.showingSolution = true;

      // Update QS dots/progress
      self.triggerXAPI('interacted');
      var xAPIEvent = self.createXAPIEventTemplate('answered');
      self.trigger(xAPIEvent);

      self.trigger('resize');
    });

    // Register DOM with H5P.Question wrapper
    this.registerDomElements();
  }

  // Proper inheritance
  C.prototype = Object.create(H5P.Question.prototype);
  C.prototype.constructor = C;

  /**
   * Creates the root element with the markup for the content type
   *
   * @param {object} params
   * @return {Element}
   */
  C.prototype.createRootElement = function (params) {
    var element = document.createElement('div');

    element.classList.add('h5p-guess-answer');
    element.innerHTML =
      '<div class="h5p-guess-answer-title">' + (params.taskDescription || '') + '</div>' +
      '<div class="media"></div>' +
      '<button class="show-solution-button" type="button">' + (params.solutionLabel || '') + '</button>' +
      '<span class="empty-text-for-nvda">&nbsp;</span>' +
      '<div class="solution-text hidden" aria-live="polite"></div>';

    return element;
  };

  C.prototype.registerDomElements = function () {
    // Actual content
    this.setContent(H5P.jQuery(this.rootElement));
  };

  // QS: indicates whether the user has given an answer
  C.prototype.getAnswerGiven = function () {
    return !!this.answered;
  };

  // QS scoring
  C.prototype.getMaxScore = function () { return 0; };
  C.prototype.getScore = function () { return 0; };

  // QS: state save/restore
  C.prototype.getCurrentState = function () {
    return {
      answered: this.answered,
      showingSolution: this.showingSolution
    };
  };

  // QS: reset
  C.prototype.resetTask = function () {
    this.answered = false;
    this.showingSolution = false;

    var buttonElement = this.rootElement.querySelector('.show-solution-button');
    var solutionElement = this.rootElement.querySelector('.solution-text');

    if (buttonElement) buttonElement.classList.remove('hidden');
    if (solutionElement) {
      solutionElement.classList.add('hidden');
      solutionElement.innerHTML = '';
    }

    this.trigger('resize');
  };

  return C;
})();
