async function checkBot() {
  const token = '8883872480:AAFcNCc0Id1aC4Z81_yCEMVkXr_dgolXgjU';
  const meRes = await fetch('https://api.telegram.org/bot' + token + '/getMe');
  const me = await meRes.json();
  console.log('Bot getMe:', JSON.stringify(me, null, 2));

  const photosRes = await fetch('https://api.telegram.org/bot' + token + '/getUserProfilePhotos?user_id=' + me.result.id);
  const photos = await photosRes.json();
  console.log('Bot photos:', JSON.stringify(photos, null, 2));

  if (photos.result?.photos?.length > 0) {
    const largestPhoto = photos.result.photos[0][photos.result.photos[0].length - 1];
    const fileRes = await fetch('https://api.telegram.org/bot' + token + '/getFile?file_id=' + largestPhoto.file_id);
    const fileData = await fileRes.json();
    console.log('File path:', fileData.result.file_path);
    const fileUrl = 'https://api.telegram.org/file/bot' + token + '/' + fileData.result.file_path;
    console.log('Full download URL:', fileUrl);
  }
}
checkBot();
