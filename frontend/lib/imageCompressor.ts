// expo-file-system/legacy keeps the old API available during SDK 54 migration
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

const MAX_BYTES = 512000;
const MAX_WIDTH = 1200;

async function compressAtQuality(uri: string, quality: number): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: MAX_WIDTH } }],
    { compress: quality, format: ImageManipulator.SaveFormat.JPEG },
  );
  return result.uri;
}

async function getFileSize(uri: string): Promise<number> {
  const info = await FileSystem.getInfoAsync(uri);
  const maybeSize = (info as { size?: number }).size;
  return info.exists && typeof maybeSize === 'number' ? maybeSize : 0;
}

export async function compressImage(uri: string): Promise<string> {
  const q70 = await compressAtQuality(uri, 0.7);
  if ((await getFileSize(q70)) <= MAX_BYTES) return q70;

  const q50 = await compressAtQuality(uri, 0.5);
  if ((await getFileSize(q50)) <= MAX_BYTES) return q50;

  const q30 = await compressAtQuality(uri, 0.3);
  return q30;
}

export async function pickAndCompress(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    // eslint-disable-next-line deprecation/deprecation — MediaType requires expo-image-picker >=17.1
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: false,
    quality: 1,
  });

  if (result.canceled || !result.assets?.[0]?.uri) return null;
  return compressImage(result.assets[0].uri);
}
