import _ from 'lodash';
import React, { FC, useCallback, useState } from 'react';
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
import { drawTiles, copyBlobToClipboard } from '../util/util';
import usePrevious from '../hooks/usePrevious';

const REQUIRES_INTERACTION_TO_COPY = /^((?!chrome|android).)*safari/i.test(navigator.userAgent) || /android/i.test(navigator.userAgent);
const IS_SAFARI_MOBILE = navigator.userAgent.match(/(iPod|iPhone|iPad)/);
const INITIAL_SIZE = 6;
const DECK_NUMBERS = DECK.map((_, i) => i + 1);
const SNACKBAR_POSITION = { vertical: 'top', horizontal: 'center' } as const;
const NOTIFICATION_COPIED = 'Картинки скопированы в буфер!';

function getUrlByNumber(number: number) {
  return DECK[number - 1];
}

const Home: FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [outs, setOuts] = useState<number[]>([]);
  const [isModalOpen, openModal, closeModal] = useFlag();
  const [selectedInput, setSelectedInput] = useState<string>('');
  const [successNotification, setSuccessNotification] = useState<string>();
  const [errorNotification, setErrorNotification] = useState<string>();
  // Only used for browsers that require user interaction to copy
  const [blobToCopy, setBlobToCopy] = useState<Blob>();
  const [blobUrlToCopy, setBlobUrlToCopy] = useState<string>();

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

    setIsLoading(true);
    downloadAndCopy(selectedNumbers).then(() => {
      closeModal();
      setSelectedInput('');
    }, () => {
      setErrorNotification('Ошибка');
      setIsLoading(false);
    });
  }, [closeModal, downloadAndCopy, outs, selectedInput]);

  const handleCloseSnackbar = useCallback(() => {
    setSuccessNotification(undefined);
    setErrorNotification(undefined);
  }, []);


  const handleCloseSafariModal = useCallback(() => {
    setIsLoading(false);
    setBlobToCopy(undefined);
    setBlobUrlToCopy(undefined);
    URL.revokeObjectURL(blobUrlToCopy!);
  }, [blobUrlToCopy]);

  const handleSafariCopy = useCallback(() => {
    copyBlobToClipboard(blobToCopy!).then(() => {
      setSuccessNotification(NOTIFICATION_COPIED);
      handleCloseSafariModal();
    }, () => {
      setErrorNotification('Ошибка');
      handleCloseSafariModal();
    });
  }, [blobToCopy, handleCloseSafariModal]);

  const notification = successNotification || errorNotification;
  const prevNotification = usePrevious(notification, true);
  const notificationStyle = successNotification ? 'success' : errorNotification ? 'error' : undefined;
  const prevNotificationStyle = usePrevious(notificationStyle, true);

  return (
    <>
      <Box mb={8}>
        <LinearProgress style={{ visibility: isLoading ? 'visible' : 'hidden' }} />
      </Box>
      <Container maxWidth="md">
        <Grid container spacing={2} alignItems="center" justify="space-between" direction="column">
          <Grid item>
            <Typography variant="h5">
              Скопировать карты в буфер
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
                <Typography variant="h5">
                  Вышедшие карты
                </Typography>
              </Grid>
              <Grid item>
                {outs.join(', ')}
              </Grid>
            </>
          )}
        </Grid>
        <Snackbar
          open={Boolean(notification)}
          anchorOrigin={SNACKBAR_POSITION}
          autoHideDuration={3000}
          onClose={handleCloseSnackbar}
        >
          <Alert onClose={handleCloseSnackbar} severity={prevNotificationStyle}>
            {prevNotification}
          </Alert>
        </Snackbar>
      </Container>
      {REQUIRES_INTERACTION_TO_COPY && (
        <Dialog open={Boolean(blobToCopy)} onClose={handleCloseSafariModal} aria-labelledby="form-dialog-title">
          {IS_SAFARI_MOBILE ? (
            <>
              <DialogTitle>
                <Grid container alignItems="center" justify="space-between">
                  <Grid item>
                    Скопируй!
                  </Grid>
                  <Grid item>
                    <IconButton aria-label="close" onClick={handleCloseSafariModal}>
                      <CloseIcon />
                    </IconButton>
                  </Grid>
                </Grid>
              </DialogTitle>
              <DialogContent>
                <img src={blobUrlToCopy} width="100%" alt="" />
              </DialogContent>
            </>
          ) : (
            <Button variant="contained" color="primary" onClick={handleSafariCopy}>
              Скопировать
            </Button>
          )}
        </Dialog>
      )}
    </>
  );
};

export default Home;
