import _ from 'lodash';
import React, { FC, useCallback, useEffect, useState } from 'react';
import {
  Container,
  LinearProgress,
  Typography,
  Box,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar,
  IconButton,
} from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import CloseIcon from '@material-ui/icons/Close';
import useFlag from '../hooks/useFlag';
import DECK from '../deck';
import { drawTiles, copyBlobToClipboard, CLIPBOARD_ITEM_SUPPORTED } from '../util/util';
import useCurrentOrPrevious from '../hooks/useCurrentOrPrevious';

const IS_SAFARI = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
const IS_IOS = navigator.userAgent.match(/(iPod|iPhone|iPad)/);
const IS_SAFARI_DESKTOP = IS_SAFARI && !IS_IOS;
const IS_ANDROID = /android/i.test(navigator.userAgent);
const REQUIRES_INTERACTION_TO_COPY = !CLIPBOARD_ITEM_SUPPORTED || IS_SAFARI || IS_ANDROID;

const INITIAL_SIZE = 6;
const DECK_NUMBERS = DECK.map((_, i) => i + 1);
const SNACKBAR_POSITION = { vertical: 'top', horizontal: 'center' } as const;
const NOTIFICATION_COPIED = 'Картинки скопированы в буфер!';
const LOCAL_STORAGE_KEY = 'savedState';

function getUrlByNumber(number: number) {
  return DECK[number - 1];
}

function getSavedOuts() {
  const json = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!json) {
    return undefined;
  }

  return JSON.parse(json);
}

function saveOuts(outs: number[]) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(outs));
}

const Home: FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [outs, setOuts] = useState<number[]>(getSavedOuts() || []);
  const [isModalOpen, openModal, closeModal] = useFlag();
  const [selectedInput, setSelectedInput] = useState<string>('');
  const [successNotification, setSuccessNotification] = useState<string>();
  const [errorNotification, setErrorNotification] = useState<string>();
  // Used by Safari Desktop which allows copying with another button
  const [blobToCopy, setBlobToCopy] = useState<Blob>();
  // Only used for Android and Safari Mobile to manually copy image
  const [blobUrlToCopy, setBlobUrlToCopy] = useState<string>();

  useEffect(() => {
    saveOuts(outs);
  }, [outs]);

  const downloadAndCopy = useCallback(async (numbers: number[]) => {
    const urls = numbers.map(getUrlByNumber);
    const pngBlob = await drawTiles(urls);

    if (REQUIRES_INTERACTION_TO_COPY) {
      setBlobToCopy(pngBlob);
      setBlobUrlToCopy(URL.createObjectURL(pngBlob));
    } else {
      await copyBlobToClipboard(pngBlob);
      setSuccessNotification(NOTIFICATION_COPIED);
      setIsLoading(false);
    }
  }, []);

  const handleSelectedInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedInput(e.target.value);
  }, []);

  const handleInitialClick = useCallback(() => {
    const remainingNumbers = _.without(DECK_NUMBERS, ...outs);
    if (!remainingNumbers.length) {
      setErrorNotification('Колода пуста!');
      setIsLoading(false);
      return;
    }

    const numbersToTake = _.sampleSize(remainingNumbers, INITIAL_SIZE);

    setIsLoading(true);
    downloadAndCopy(numbersToTake).then(() => {
      setOuts([...outs, ...numbersToTake]);
    }, () => {
      setErrorNotification('Ошибка');
      setIsLoading(false);
    });
  }, [downloadAndCopy, outs]);

  const handleAddonClick = useCallback(() => {
    const remainingNumbers = _.without(DECK_NUMBERS, ...outs);
    if (!remainingNumbers.length) {
      setErrorNotification('Колода пуста!');
      return;
    }

    const numberToTake = _.sample(remainingNumbers)!;

    setIsLoading(true);
    downloadAndCopy([numberToTake]).then(() => {
      setOuts([...outs, numberToTake]);
    }, () => {
      setErrorNotification('Ошибка');
      setIsLoading(false);
    });
  }, [downloadAndCopy, outs]);

  const handleSelectedInput = useCallback(() => {
    const selectedNumbers = (selectedInput || '').split(/[^\d]/).map(Number).filter(Boolean);
    if (!selectedNumbers.length) {
      setErrorNotification('Перечисли выбранные номера!');
      return;
    }

    const allAreOuts = !selectedNumbers.every((selectedNumber) => outs.includes(selectedNumber));
    if (allAreOuts) {
      setErrorNotification('Некоторые номера ещё не вышли!');
      return;
    }

    setIsLoading(true);
    downloadAndCopy(selectedNumbers).then(() => {
      closeModal();
      setSelectedInput('');
    }, () => {
      setErrorNotification('Ошибка');
      setIsLoading(false);
    });
  }, [closeModal, downloadAndCopy, outs, selectedInput]);

  const handleNewRound = useCallback(() => {
    if (window.confirm('Точно?')) {
      setOuts([]);
    }
  }, []);

  const handleCloseSnackbar = useCallback(() => {
    setSuccessNotification(undefined);
    setErrorNotification(undefined);
  }, []);

  const handleCloseCopyModal = useCallback(() => {
    setIsLoading(false);
    setBlobToCopy(undefined);
    setBlobUrlToCopy(undefined);
    URL.revokeObjectURL(blobUrlToCopy!);
  }, [blobUrlToCopy]);

  const handleSafariCopy = useCallback(() => {
    copyBlobToClipboard(blobToCopy!).then(() => {
      setSuccessNotification(NOTIFICATION_COPIED);
      handleCloseCopyModal();
    }, () => {
      setErrorNotification('Ошибка');
      handleCloseCopyModal();
    });
  }, [blobToCopy, handleCloseCopyModal]);

  const notification = useCurrentOrPrevious(successNotification || errorNotification, true);
  const notificationStyle = useCurrentOrPrevious(
    successNotification ? 'success' : errorNotification ? 'error' : undefined,
    true,
  );

  return (
    <>
      <Box mb={9}>
        <LinearProgress style={{ visibility: isLoading ? 'visible' : 'hidden' }} />
      </Box>
      <Container maxWidth="md">
        <Grid container spacing={2} alignItems="center" justify="space-between" direction="column">
          <Grid item>
            <Typography variant="h5">
              Скопировать картинки:
            </Typography>
          </Grid>
          <Grid item>
            <Button variant="contained" color="primary" onClick={handleInitialClick} disabled={isLoading}>
              6 из колоды (начало игры)
            </Button>
          </Grid>
          <Grid item>
            <Button variant="contained" color="primary" onClick={handleAddonClick} disabled={isLoading}>
              1 из колоды (добор)
            </Button>
          </Grid>
          <Grid item>
            <Button variant="contained" color="primary" onClick={openModal} disabled={isLoading}>
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
                <Button onClick={closeModal} color="primary" disabled={isLoading}>
                  Отмена
                </Button>
                <Button onClick={handleSelectedInput} color="primary">
                  Скопировать
                </Button>
              </DialogActions>
            </Dialog>
          </Grid>
          {Boolean(outs.length) && (
            <>
              <Grid item>
                <Box mt={5}>
                  <Typography variant="h5">
                    Вышедшие карты:
                  </Typography>
                </Box>
              </Grid>
              <Grid item>
                {outs.join(', ')}
              </Grid>
              <Grid item>
                <Button onClick={handleNewRound} color="primary">
                  Начать новый раунд
                </Button>
              </Grid>
            </>
          )}
        </Grid>
        <Snackbar
          open={Boolean(successNotification || errorNotification)}
          anchorOrigin={SNACKBAR_POSITION}
          autoHideDuration={3000}
          onClose={handleCloseSnackbar}
        >
          <Alert onClose={handleCloseSnackbar} severity={notificationStyle}>
            {notification}
          </Alert>
        </Snackbar>
      </Container>
      {REQUIRES_INTERACTION_TO_COPY && (
        <Dialog open={Boolean(blobToCopy)} onClose={handleCloseCopyModal} aria-labelledby="form-dialog-title">
          {IS_SAFARI_DESKTOP ? (
            <DialogContent>
              <Box mt={1} mb={2}>
                <Button variant="contained" color="primary" onClick={handleSafariCopy}>
                  Скопировать
                </Button>
              </Box>
            </DialogContent>
          ) : (
            <>
              <DialogTitle>
                <Grid container alignItems="center" justify="space-between">
                  <Grid item>
                    Скопируй!
                  </Grid>
                  <Grid item>
                    <IconButton aria-label="close" onClick={handleCloseCopyModal}>
                      <CloseIcon />
                    </IconButton>
                  </Grid>
                </Grid>
              </DialogTitle>
              <DialogContent>
                <img src={blobUrlToCopy} width="100%" alt="" />
              </DialogContent>
            </>
          )}
        </Dialog>
      )}
    </>
  );
};

export default Home;
