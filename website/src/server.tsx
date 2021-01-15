import axios, { AxiosResponse } from 'axios';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { IModel, mostRecentTerm } from './model/Model';
import firebase from './firebase';
import { Redirect, Route } from 'react-router-dom';

const serverContext = createContext({} as IServer);

export function ProvideServer({ children }: { children: React.ReactNode }) {
  const server = useProvideServer();

  return (
    <serverContext.Provider value={server}>{children}</serverContext.Provider>
  );
}

export const useServer = () => {
  return useContext(serverContext);
};

export interface IServer {
  model: IModel | null;
  term: string;
  profile: {
    admin: boolean;
  } | null;
  profileId: string;
  user: firebase.User | null;
  processing: boolean;
  getTerms: () => Promise<AxiosResponse<IModel['terms']>>;
  getMembers: () => Promise<AxiosResponse<IModel['members']>>;
  getCreditTypes: () => Promise<AxiosResponse<IModel['creditTypes']>>;
  updateProfile: (
    newProfileId: string,
  ) => Promise<AxiosResponse<IServer['profile']>>;
  updateModel: () => Promise<IModel>;
  clearModel: () => void;
  clearProfile: () => void;
  setMembers: (members: IModel['members']) => Promise<boolean>;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

export interface IServerResponse {
  success: boolean;
}

function useProvideServer(): IServer {
  const [processing, setProcessing] = useState(true as IServer['processing']);
  const [model, setModel] = useState(null as IServer['model']);
  const [profile, setProfile] = useState(null as IServer['profile']);
  const [profileId, setProfileId] = useState('' as IServer['profileId']);
  const [term, setTerm] = useState('' as IServer['term']);
  const [user, setUser] = useState(null as IServer['user']);

  const getTerms: IServer['getTerms'] = async () => {
    setProcessing(true);
    const result = await axios.get('/api/terms');
    setProcessing(false);
    return result;
  };

  const getMembers: IServer['getMembers'] = async () => {
    setProcessing(true);
    const result = await axios.get('/api/members');
    setProcessing(false);
    return result;
  };

  const getCreditTypes: IServer['getCreditTypes'] = async () => {
    setProcessing(true);
    const result = await axios.get('/api/creditTypes');
    setProcessing(false);
    return result;
  };

  const updateProfile: IServer['updateProfile'] = async (
    newProfileId: string,
  ) => {
    setProcessing(true);
    const result = await axios.get('/api/profile');
    setProfile(result.data);
    setProfileId(newProfileId);
    setProcessing(false);
    return result;
  };

  const clearProfile = () => {
    setProfile(null);
    setProfileId('');
  };

  const setMembers: IServer['setMembers'] = async (
    members: IModel['members'],
  ) => {
    setProcessing(true);
    const result: IServerResponse = (await axios.post('/api/members', members))
      .data;
    if (result.success) {
      const newModel = Object.assign({}, model);
      Object.assign(newModel.members, members);
      setModel(newModel);
    }
    setProcessing(false);
    return result.success;
  };

  const updateModel = async () => {
    const model: IModel = {
      members: (await getMembers()).data,
      terms: (await getTerms()).data,
      creditTypes: (await getCreditTypes()).data,
    };
    setModel(model);
    const t = mostRecentTerm(model).id;
    setTerm(t);
    return model;
  };

  const clearModel = () => setModel({} as IServer['model']);

  const signIn = async () => {
    setProcessing(true);
    const googleAuthProvider = new firebase.auth.GoogleAuthProvider();
    const authPersistence = firebase.auth.Auth.Persistence.LOCAL;

    await firebase.auth().setPersistence(authPersistence);

    return firebase.auth().signInWithRedirect(googleAuthProvider);
  };

  const signOut = () => {
    setProcessing(true);
    return firebase
      .auth()
      .signOut()
      .then(() => {
        setUser(null);
        setProcessing(false);
      });
  };

  useEffect(
    () =>
      firebase.auth().onAuthStateChanged(async newUser => {
        setProcessing(true);


        if (newUser) {
          axios.defaults.headers = {
            Authorization: 'Bearer ' + (await newUser.getIdToken()),
          };

          if (profileId !== newUser.uid) {
            updateProfile(newUser.uid);
            updateModel();
          }
        } else {
          clearProfile();
          clearModel();
        }

        setUser(newUser);
        setProcessing(false);
      }),
    [],
  );

  // useEffect(
  //   () =>
  //     firebase.auth().onAuthStateChanged(async user => {
  //       setProcessing(true);

  //       if (user) {
  //         axios.defaults.headers = {
  //           Authorization: 'Bearer ' + (await user.getIdToken()),
  //         };

  //         setProfile((await getProfile()).data);
  //       } else {
  //         setProfile(null);
  //       }

  //       setUser(user);
  //       setProcessing(false);
  //     }),
  //   [],
  // );

  return {
    model,
    profile,
    profileId,
    processing,
    term,
    user,
    getTerms,
    getMembers,
    getCreditTypes,
    updateProfile,
    setMembers,
    updateModel,
    clearModel,
    clearProfile,
    signIn,
    signOut,
  };
}

export function PrivateRoute({ children, ...rest }: any) {
  let server = useServer();

  return (
    <Route
      {...rest}
      render={({ location }) =>
        server.profile && server.profile.admin ? (
          children
        ) : (
          <Redirect
            to={{
              pathname: '/signin',
              state: { from: location },
            }}
          />
        )
      }
    />
  );
}