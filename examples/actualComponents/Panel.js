import _ from 'lodash';
import React, { Component } from 'react';
import {
  Animated,
  Dimensions,
  PanResponder,
  ScrollView,
  StyleSheet,
  TouchableHighlight,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import PropTypes from 'prop-types';

import { Bar } from './Bar';
import { Close } from './Close';

const FULL_HEIGHT = Dimensions.get('window').height;
const FULL_WIDTH = Dimensions.get('window').width;
const PANEL_HEIGHT = FULL_HEIGHT - 100;
const GESTURE_THRESHOLD = 100;
const BACKDROP_FULL_OPACITY = 0.4;

const STATUS = {
  CLOSED: 0,
  LARGE: 2,
  SMALL: 1,
};

const getLargePanelHeight = (panelLargeHeightPercentage) => (
  !panelLargeHeightPercentage ? PANEL_HEIGHT : (FULL_HEIGHT * panelLargeHeightPercentage) / 100
);

const getSmallPanelHeight = (panelLargeHeightPercentage, panelSmallHeightPercentage) => (
  (!panelSmallHeightPercentage || panelSmallHeightPercentage >= panelLargeHeightPercentage)
    ? PANEL_HEIGHT / 2
    : (FULL_HEIGHT * panelSmallHeightPercentage) / 100
);

const SwipeablePanelStyles = StyleSheet.create({
  background: {
    alignItems: 'center',
    height: FULL_HEIGHT,
    justifyContent: 'center',
    position: 'absolute',
    width: FULL_WIDTH,
    zIndex: 1,
  },
  panel: {
    backgroundColor: 'white',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderRadius: 20,
    bottom: 0,
    display: 'flex',
    elevation: 1,
    flexDirection: 'column',
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: {
      height: 1,
      width: 0,
    },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    transform: [{ translateY: FULL_HEIGHT - 100 }],
    width: FULL_WIDTH - 50,
    zIndex: 2,
  },
  scrollViewContentContainerStyle: {
    width: '100%',
  },
});

class SwipeablePanel extends Component {
  constructor(props) {
    super(props);
    this.state = {
      backdropOpacityAnimated: new Animated.Value(0),
      canScroll: false,
      isActive: false,
      opacity: new Animated.Value(0),
      pan: new Animated.ValueXY({ x: 0, y: FULL_HEIGHT }),
      panelLargeHeight: getLargePanelHeight(this.props.panelLargeHeightPercentage),
      panelSmallHeight: getSmallPanelHeight(
        this.props.panelLargeHeightPercentage,
        this.props.panelSmallHeightPercentage,
      ),
      showComponent: false,
      status: STATUS.CLOSED,
    };

    this.pan = new Animated.ValueXY({ x: 0, y: FULL_HEIGHT });
    this.isClosing = false;
    this.animatedValueY = 0;

    this.panResponder = PanResponder.create({
      onStartShouldSetPanResponder: (evt, gestureState) => true,
      onPanResponderGrant: (evt, gestureState) => {
        this.state.pan.setOffset({
          x: 0,
          y: this.animatedValueY,
        });
        this.state.pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (evt, gestureState) => {
        if (
          (this.state.status === 1
            && Math.abs(this.state.pan.y._value) <= this.state.pan.y._offset)
          || (this.state.status === 2 && this.state.pan.y._value > -1)
        ) {
          this.state.pan.setValue({
            x: 0,
            y: gestureState.dy,
          });
          if (this.state.status === 1) {
            const newPanelHeight = this.state.panelSmallHeight - gestureState.dy;
            this.state.backdropOpacityAnimated.setValue(this.calculateNewBackdropOpacity(newPanelHeight));
          } else {
            const newPanelHeight = this.state.panelLargeHeight - gestureState.dy;
            this.state.backdropOpacityAnimated.setValue(this.calculateNewBackdropOpacity(newPanelHeight));
          }
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        const { onlyLarge, gestureTreshold } = this.props;
        this.state.pan.flattenOffset();

        if (gestureState.dy === 0) {
          this.animateTo(this.state.status);
        } else if (
          gestureState.dy < -gestureTreshold
          || gestureState.vy < -0.5
        ) {
          if (this.state.status === STATUS.SMALL) this.animateTo(STATUS.LARGE);
          else {
            this.animateTo(STATUS.LARGE);
          }
        } else if (
          gestureState.dy > gestureTreshold
          || gestureState.vy > 0.5
        ) {
          if (this.state.status === STATUS.LARGE) this.animateTo(onlyLarge ? STATUS.CLOSED : STATUS.SMALL);
          else this.animateTo(0);
        } else {
          this.animateTo(this.state.status);
        }
      },
    });
  }

  componentDidMount = () => {
    this.animatedValueY = 0;
    this.state.pan.y.addListener((value) => (this.animatedValueY = value.value));

    this.setState({ isActive: this.props.isActive });
  };

  componentDidUpdate(prevProps) {
    const { isActive, openLarge, onlyLarge } = this.props;

    if (prevProps.isActive !== isActive) {
      this.setState({ isActive });

      if (isActive) {
        this.animateTo(
          openLarge ? STATUS.LARGE : onlyLarge ? STATUS.LARGE : STATUS.SMALL,
        );
      } else {
        this.animateTo();
      }
    }
  }

  calculateNewBackdropOpacity = (newPanelHeight) => (
    (newPanelHeight * BACKDROP_FULL_OPACITY) / this.state.panelLargeHeight
  );

  animateTo = (newStatus = 0) => {
    let newY = 0;

    switch (newStatus) {
      case 0:
        newY = this.state.panelLargeHeight;
        break;
      case 1:
        newY = this.state.panelSmallHeight;
        break;
      case 2:
        newY = 0;
        break;
      default:
        newY = this.state.panelLargeHeight;
    }

    this.setState({
      showComponent: true,
      status: newStatus,
    });

    Animated.parallel([
      Animated.spring(this.state.pan, {
        friction: 25,
        tension: 80,
        toValue: { x: 0, y: newY },
      }),
      Animated.timing(this.state.backdropOpacityAnimated, {
        toValue: this.calculateNewBackdropOpacity(this.state.panelLargeHeight - newY),
      }),
    ]).start();

    this.setState({ canScroll: newStatus === 2 });

    if (newStatus === 0) {
      setTimeout(() => {
        this.props.onClose();
        this.setState({
          showComponent: false,
        });
      }, 360);
    }
  };

  render() {
    const { showComponent } = this.state;
    const {
      barStyle,
      nobackdropOpacity,
      style,
      closeRootStyle,
      closeIconStyle,
    } = this.props;

    return showComponent ? (
      <Animated.View
        style={[
          SwipeablePanelStyles.background,
        ]}>
          <Animated.View
          style={[
            SwipeablePanelStyles.background,
            {
              backgroundColor: 'black',
              opacity: nobackdropOpacity
                ? 0
                : this.state.backdropOpacityAnimated,
            },
          ]}/>
        {this.props.closeOnTouchOutside && (
          <TouchableWithoutFeedback onPress={() => this.props.onClose()}>
            <View
              style={[
                SwipeablePanelStyles.background,
                { backgroundColor: 'rgba(0,0,0,0)' },
              ]}
            />
          </TouchableWithoutFeedback>
        )}
        <Animated.View
          style={[
            SwipeablePanelStyles.panel,
            { height: this.state.panelLargeHeight },
            { width: this.props.fullWidth ? FULL_WIDTH : FULL_WIDTH - 50 },
            { transform: this.state.pan.getTranslateTransform() },
            style,
          ]}
          {...this.panResponder.panHandlers}>
          {!this.props.noBar && <Bar barStyle={barStyle}/>}
          {this.props.showCloseButton && (
            <Close
              rootStyle={closeRootStyle}
              iconStyle={closeIconStyle}
              onPress={this.props.onClose}
            />
          )}
          <ScrollView
            // onTouchStart={() => false}
            // onTouchEnd={() => false}
            onTouchStart={_.constant(false)}
            onTouchEnd={_.constant(false)}
            contentContainerStyle={
              SwipeablePanelStyles.scrollViewContentContainerStyle
            }>
            {this.state.canScroll ? (
              <TouchableHighlight>
                <React.Fragment>{this.props.children}</React.Fragment>
              </TouchableHighlight>
            ) : (
              this.props.children
            )}
          </ScrollView>
        </Animated.View>
      </Animated.View>
    ) : null;
  }
}

SwipeablePanel.propTypes = {
  barStyle: PropTypes.object,
  children: PropTypes.node,
  closeIconStyle: PropTypes.object,
  closeOnTouchOutside: PropTypes.bool,
  closeRootStyle: PropTypes.object,
  fullWidth: PropTypes.bool,
  gestureTreshold: PropTypes.number,
  isActive: PropTypes.bool.isRequired,
  nobackdropOpacity: PropTypes.bool,
  noBar: PropTypes.bool,
  onClose: PropTypes.func,
  onlyLarge: PropTypes.bool,
  openLarge: PropTypes.bool,
  panelLargeHeightPercentage: PropTypes.number,
  panelSmallHeightPercentage: PropTypes.number,
  showCloseButton: PropTypes.bool,
  style: PropTypes.object,
};

SwipeablePanel.defaultProps = {
  barStyle: {},
  closeIconStyle: {},
  closeOnTouchOutside: false,
  closeRootStyle: {},
  fullWidth: true,
  gestureTreshold: GESTURE_THRESHOLD,
  noBar: false,
  onClose: _.noop,
  onlyLarge: false,
  openLarge: false,
  panelLargeHeightPercentage: null,
  panelSmallHeightPercentage: null,
  showCloseButton: false,
  style: {},
};

export default SwipeablePanel;
