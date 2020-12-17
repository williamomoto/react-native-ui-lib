// TODO: Support onChange callback
// TODO: Support style customization
// TODO: Support control of visible items
import _ from 'lodash';
import React, {useCallback, useRef, useMemo, useEffect} from 'react';
import {TextStyle, ViewStyle, FlatList, NativeSyntheticEvent, NativeScrollEvent} from 'react-native';
import Animated from 'react-native-reanimated';
import {onScrollEvent, useValues} from 'react-native-redash';
import {Colors} from '../../../src/style';
import View from '../../components/view';
import Fader, {FaderPosition} from '../../components/fader';
import {Constants} from '../../helpers';
import useMiddleIndex from './helpers/useListMiddleIndex';
import Item, {ItemProps} from './Item';
import {Spacings} from 'react-native-ui-lib';

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

export interface WheelPickerProps {
  /**
   * Data source for WheelPicker
   */
  items?: ItemProps[];
  /**
   * Describe the height of each item in the WheelPicker
   * default value: 44
   */
  itemHeight?: number;
  /**
   * Describe the number of rows visible
   * default value: 5
   */
  numberOfVisibleRows?: number;
  /**
   * Text color for the focused row
   */
  activeTextColor?: string;
  /**
   * Text color for other, non-focused rows
   */
  inactiveTextColor?: string;
  /**
   * Row text style
   */
  textStyle?: TextStyle;
  /**
   * Event, on active row change
   */
  onValueChange: (item: string | undefined, index: number) => void;
  /**
   * Container's ViewStyle, height is computed according to itemHeight * numberOfVisibleRows
   */
  style?: Omit<ViewStyle, 'height'>;
  /**
   * Support passing items as children props
   */
  children?: JSX.Element | JSX.Element[];
  /**
   * WheelPicker initial value, can be ItemProps.value, number as index
   */
  selectedValue?: ItemProps | number
}

const WheelPicker = ({
  items: propsItems,
  itemHeight = 44,
  numberOfVisibleRows = 6,
  activeTextColor,
  inactiveTextColor,
  textStyle,
  onValueChange,
  style,
  children,
  selectedValue,
}: WheelPickerProps) => {
  const height = itemHeight * numberOfVisibleRows;
  const scrollView = useRef<Animated.ScrollView>();
  const [offset] = useValues([0], []);
  const onScroll = onScrollEvent({y: offset});
  const items = children ? extractItemsFromChildren() : propsItems;
  
  const listSize = items?.length || 0;
  const middleIndex = useMiddleIndex({itemHeight, listSize});

  function extractItemsFromChildren (): ItemProps[] | undefined {
    const items = React.Children.map(children, child => {
      let childAsType: ItemProps = {value: child?.props.value, label: child?.props.label};
      return childAsType;
    });
    return items;
  };

  const getIndexFromSelectedValue = (): number => {
    if (_.isNumber(selectedValue)) {      
      return selectedValue >= 0 ? selectedValue : 0;
    }
    if (_.isString(selectedValue)) {
      return _.findIndex(items, {value: selectedValue});
    }
    return _.findIndex(items, {value: selectedValue?.value});
  }

  const scrollToPassedIndex = (animated: boolean = true) => {
    const index = getIndexFromSelectedValue();
    scrollToIndex(index, animated);
  }

  useEffect(() => {
    setTimeout(() => {
      scrollToPassedIndex(false);
    }, 100);    
  }, []);

  const scrollToIndex = (index: number, animated: boolean) => {
    if (scrollView.current?.getNode()) {
      //@ts-ignore for some reason scrollToOffset isn't recognized
      scrollView.current?.getNode()?.scrollToOffset({offset: index * itemHeight, animated: animated});
    }
  }

  const selectItem = useCallback(
    index => {
      scrollToIndex(index, true);
    },
    [itemHeight]
  );

  const onChange = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = middleIndex(event.nativeEvent.contentOffset.y);
    onValueChange?.('' + items?.[index].value, index);
  }, []);

  const renderItem = useCallback(
    ({item, index}) => {
      return (
        <Item
          index={index}
          itemHeight={itemHeight}
          offset={offset}
          activeColor={activeTextColor}
          inactiveColor={inactiveTextColor}
          style={textStyle}
          {...item}
          onSelect={selectItem}
        />
      );
    },
    [itemHeight]
  );

  const fader = useMemo(
    () => (position: FaderPosition) => {
      return <Fader visible position={position} size={60} />;
    },
    []
  );

  const separators = useMemo(() => {
    return (
      <View absF centerV pointerEvents="none">
        <View
          style={{
            borderTopWidth: 1,
            borderBottomWidth: 1,
            height: Spacings.s9,
            borderColor: Colors.grey60
          }}
        />
      </View>
    );
  }, []);

  return (
    <View style={style}>
      <AnimatedFlatList
        height={height}
        data={items}
        keyExtractor={keyExtractor}
        scrollEventThrottle={100}
        onScroll={onScroll}
        onMomentumScrollEnd={onChange}
        showsVerticalScrollIndicator={false}
        // @ts-ignore
        ref={scrollView}
        contentContainerStyle={{
          paddingVertical: height / 2 - itemHeight / 2
        }}
        snapToInterval={itemHeight}
        decelerationRate={Constants.isAndroid ? 0.98 : 'normal'}
        renderItem={renderItem}
      />
      {fader(FaderPosition.BOTTOM)}
      {fader(FaderPosition.TOP)}
      {separators}
    </View>
  );
};

const keyExtractor = (item: ItemProps) => `${item.value}`;

export default WheelPicker;
