const os = require('os');
const axios = require('axios');
const { name, version } = require('../package.json');

const defaultUploadPackageInfoUrl = 'https://api-track.kylin.shuyun.com/monitor-service/upload-package-info';

const uploadPackageInfo = config => {
  const { packageInfo, ...rest } = config;
  return axios
    .post(rest.uploadPackageInfoUrl || defaultUploadPackageInfoUrl, {
      ...packageInfo,
      ...rest,
      packageName: name,
      packageVersion: version,
    })
    .catch(err => {
      axios
        .post(rest.uploadPackageInfoUrl || defaultUploadPackageInfoUrl, {
          ...rest,
          name: packageInfo.name,
          packageInfo: JSON.stringify(packageInfo),
          uploadError: err.stack || err.toString(),
          packageName: name,
          packageVersion: version,
        })
        .then(res => {
          console.log('res.data', res.data);
        })
        .catch(err => {
          console.warn(name + ': upload package-version-info error again', err.stack || err.toString());
        });
    });
};

module.exports = uploadPackageInfo;
