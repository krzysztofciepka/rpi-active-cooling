const { exec } = require('child_process');
const rpiGpio = require('rpi-gpio').promise;
const debug = require('debug')('rpi-active-cooling');

async function execCmd(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        return reject(err);
      }

      if (stderr) {
        return reject(stderr);
      }

      return resolve(stdout);
    });
  });
}

async function readTemp() {
  return execCmd('vcgencmd measure_temp');
}

function parseTempOutput(temp) {
  const regex = new RegExp(/[0-9][0-9]\.[0-9]/, 'g');

  const matches = regex.exec(temp);

  if (!matches || !matches.length) {
    return '';
  }

  return parseFloat(matches[0], 10);
}

async function setupGpio(gpio) {
  await rpiGpio.setup(gpio, gpio.DIR_OUT);

  return {
    enable: async () => {
      debug('enable: ', gpio);
      await rpiGpio.write(parseInt(gpio, 10), true);
    },
    disable: async () => {
      debug('disable: ', gpio);
      await rpiGpio.write(parseInt(gpio, 10), false);
    },
  };
}

async function enableFan(fanGpio) {
  await fanGpio.enable();
}

async function disableFan(fanGpio) {
  await fanGpio.disable();
}

async function controlTemp(gpio, min, max, interval) {
  const fanGpio = await setupGpio(gpio);

  return setInterval(async () => {
    const temp = parseTempOutput(await readTemp());

    if (temp > parseFloat(max, 10)) {
      await enableFan(fanGpio);
    }

    if (temp < parseFloat(min, 10)) {
      await disableFan(fanGpio);
    }
  }, interval);
}


module.exports = {
  controlTemp,
};
