/**
 * Copyright 2015 The AMP HTML Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {Gestures} from '../../../src/gesture';
import {Layout} from '../../../src/layout';
import {SwipeXYRecognizer} from '../../../src/gesture-recognizers';
import {historyFor} from '../../../src/history';
import {vsyncFor} from '../../../src/vsync';
import * as st from '../../../src/style';


class AmpLightbox extends AMP.BaseElement {

  /** @override */
  isLayoutSupported(layout) {
    return layout == Layout.NODISPLAY;
  }

  /** @override */
  buildCallback() {
    st.setStyles(this.element, {
      position: 'fixed',
      zIndex: 1000,
      top: 0,
      left: 0,
      bottom: 0,
      right: 0,
    });

    const children = this.getRealChildren();

    /** @private {!Element} */
    this.container_ = this.element.ownerDocument.createElement('div');
    this.applyFillContent(this.container_);
    this.element.appendChild(this.container_);
    children.forEach(child => {
      this.container_.appendChild(child);
    });

    this.registerAction('close', this.close.bind(this));

    const gestures = Gestures.get(this.element);
    gestures.onGesture(SwipeXYRecognizer, () => {
      // Consume to block scroll events and side-swipe.
    });

    /** @private {number} */
    this.historyId_ = -1;

    /** @private {boolean} */
    this.active_ = false;
  }

  /** @override */
  layoutCallback() {
    return Promise.resolve();
  }

  /** @override */
  activate() {
    if (this.active_) {
      return;
    }
    /**  @private {function(this:AmpLightbox, Event)}*/
    this.boundCloseOnEscape_ = this.closeOnEscape_.bind(this);
    this.win.document.documentElement.addEventListener(
        'keydown', this.boundCloseOnEscape_);
    this.getViewport().enterLightboxMode();

    this.mutateElement(() => {
      this.element.style.display = '';
      this.element.style.opacity = 0;
      // TODO(dvoytenko): use new animations support instead.
      this.element.style.transition = 'opacity 0.1s ease-in';
      vsyncFor(this.win).mutate(() => {
        this.element.style.opacity = '';
      });
    }).then(() => {
      this.updateInViewport(this.container_, true);
      this.scheduleLayout(this.container_);
      this.scheduleResume(this.container_);
    });

    this.getHistory_().push(this.close.bind(this)).then(historyId => {
      this.historyId_ = historyId;
    });

    this.active_ = true;
  }

  /**
   * Handles closing the lightbox when the ESC key is pressed.
   * @param {!Event} event.
   * @private
   */
  closeOnEscape_(event) {
    if (event.keyCode == 27) {
      this.close();
    }
  }

  close() {
    if (!this.active_) {
      return;
    }
    this.getViewport().leaveLightboxMode();
    this.element.style.display = 'none';
    if (this.historyId_ != -1) {
      this.getHistory_().pop(this.historyId_);
    }
    this.win.document.documentElement.removeEventListener(
        'keydown', this.boundCloseOnEscape_);
    this.boundCloseOnEscape_ = null;
    this.schedulePause(this.container_);
    this.active_ = false;
  }

  getHistory_() {
    return historyFor(this.element.ownerDocument.defaultView);
  }
}

AMP.registerElement('amp-lightbox', AmpLightbox);
