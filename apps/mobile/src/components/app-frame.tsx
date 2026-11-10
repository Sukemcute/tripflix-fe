import { createContext, useContext, useState, type PropsWithChildren } from 'react';
import { View, type ViewStyle } from 'react-native';

type Frame = { x: number; width: number };
const AppFrameContext = createContext<Frame | null>(null);

/** Khung chứa cả app; đo vị trí và bề rộng thật để bảng nổi (Modal) phủ đúng khung, không phủ cả cửa sổ web. */
export function AppFrame({ children, style }: PropsWithChildren<{ style?: ViewStyle }>) {
  const [frame, setFrame] = useState<Frame | null>(null);
  return (
    <View
      style={style}
      onLayout={(event) => {
        const { x, width } = event.nativeEvent.layout;
        setFrame((previous) => (previous?.x === x && previous.width === width ? previous : { x, width }));
      }}
    >
      <AppFrameContext.Provider value={frame}>{children}</AppFrameContext.Provider>
    </View>
  );
}

/** Vị trí và bề rộng khung app; null khi chưa đo (lúc đó dùng hết bề rộng màn hình). */
export function useAppFrame(): Frame | null {
  return useContext(AppFrameContext);
}
