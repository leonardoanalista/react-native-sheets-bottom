import { StyleSheet, View } from 'react-native';
import React from 'react';

export const Separator = ({}) => {
  return (
    <View style={Styles.separatorContainer}>
      <View style={Styles.separator} />
    </View>
  );
};

const Styles = StyleSheet.create({
  separatorContainer: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'center',
  },
  separator: {
    backgroundColor: '#e2e2e2',
    height: 1,
    marginBottom: 5,
    marginTop: 5,
    width: '90%',
  },
});
