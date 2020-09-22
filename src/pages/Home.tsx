import _ from 'lodash';
import React, { FC, useCallback, useState } from 'react';
import {
  Container,
  Typography,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar,
} from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import useFlag from '../hooks/useFlag';
import DECK from '../deck';
import { drawTiles, copyBlobToClipboard } from '../util/util';
import usePrevious from '../hooks/usePrevious';

const INITIAL_SIZE = 6;
const DECK_NUMBERS = DECK.map((_, i) => i + 1);
const SNACKBAR_POSITION = { vertical: 'top', horizontal: 'right' } as const;

function getUrlByNumber(number: number) {
  return DECK[number - 1];
}

async function downloadAndCopy(numbers: number[]) {
  const urls = numbers.map(getUrlByNumber);
  const pngBlob = await drawTiles(urls);
  await copyBlobToClipboard(pngBlob);
}

const Home: FC = () => {
  const [outs, setOuts] = useState<number[]>([]);
  const [isModalOpen, openModal, closeModal] = useFlag();
  const [selectedInput, setSelectedInput] = useState<string>('');
  const [successNotification, setSuccessNotification] = useState<string>();
  const [errorNotification, setErrorNotification] = useState<string>();

  const handleSelectedInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedInput(e.target.value);
  }, []);

  const handleInitialClick = useCallback(() => {
    const remainingNumbers = _.without(DECK_NUMBERS, ...outs);
    if (!remainingNumbers.length) {
      setErrorNotification('Колода пуста!');
      return;
    }

    const numbersToTake = _.sampleSize(remainingNumbers, INITIAL_SIZE);
    downloadAndCopy(numbersToTake).then(() => {
      setSuccessNotification('Скопировано в буфер обмена!');
      setOuts([...outs, ...numbersToTake]);
    });
  }, [outs]);

  const handleAddonClick = useCallback(() => {
    const remainingNumbers = _.without(DECK_NUMBERS, ...outs);
    if (!remainingNumbers.length) {
      setErrorNotification('Колода пуста!');
      return;
    }

    const numberToTake = _.sample(remainingNumbers)!;
    downloadAndCopy([numberToTake]).then(() => {
      setSuccessNotification('Скопировано в буфер обмена!');
      setOuts([...outs, numberToTake]);
    });
  }, [outs]);

  const handleSelectedInput = useCallback(() => {
    const selectedNumbers = (selectedInput || '').split(/[^\d]/).map(Number);
    if (!selectedNumbers.length) {
      setErrorNotification('Перечисли выбранные номера!');
      return;
    }

    const allAreOuts = !selectedNumbers.every((selectedNumber) => outs.includes(selectedNumber));
    if (allAreOuts) {
      setErrorNotification('Некоторые номера ещё не вышли!');
      return;
    }

    downloadAndCopy(selectedNumbers).then(() => {
      setSuccessNotification('Скопировано в буфер обмена!');
      closeModal();
      setSelectedInput('');
    });
  }, [closeModal, outs, selectedInput]);

  const handleCloseSnackbar = useCallback(() => {
    setSuccessNotification(undefined);
    setErrorNotification(undefined);
  }, []);

  const notification = successNotification || errorNotification;
  const prevNotification = usePrevious(notification, true);
  const notificationStyle = successNotification ? 'success' : errorNotification ? 'error' : undefined;
  const prevNotificationStyle = usePrevious(notificationStyle, true);

  return (
    <Container maxWidth="md">
      <Grid container alignItems="center" justify="space-between" direction="column">
        <Grid item>
          <Typography variant="h5">
            Скопировать карты в буфер
          </Typography>
        </Grid>
        <Grid item>
          <Button color="primary" onClick={handleInitialClick}>
            6 из колоды (начало игры)
          </Button>
        </Grid>
        <Grid item>
          <Button color="primary" onClick={handleAddonClick}>
            1 из колоды (добор)
          </Button>
        </Grid>
        <Grid item>
          <Button color="primary" onClick={openModal}>
            Выбранные на тур (по номерам)
          </Button>
          <Dialog open={isModalOpen} onClose={closeModal} aria-labelledby="form-dialog-title">
            <DialogTitle id="form-dialog-title">Выбраны на тур:</DialogTitle>
            <DialogContent>
              <TextField
                value={selectedInput}
                autoFocus
                margin="dense"
                id="name"
                label="Список номеров"
                fullWidth
                onChange={handleSelectedInputChange}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={closeModal} color="primary">
                Отмена
              </Button>
              <Button onClick={handleSelectedInput} color="primary">
                Скопировать
              </Button>
            </DialogActions>
          </Dialog>
        </Grid>
        <Grid item>
          <Typography variant="h5">
            Вышедшие карты
          </Typography>
        </Grid>
        <Grid item>
          {outs.join(', ')}
        </Grid>
      </Grid>
      <Snackbar
        open={Boolean(notification)}
        anchorOrigin={SNACKBAR_POSITION}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert onClose={handleCloseSnackbar} severity={prevNotificationStyle}>
          {prevNotification}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Home;
