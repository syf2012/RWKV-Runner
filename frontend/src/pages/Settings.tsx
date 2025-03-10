import React, { FC, useEffect, useRef } from 'react';
import { Page } from '../components/Page';
import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  Dropdown,
  Input,
  Option,
  Switch
} from '@fluentui/react-components';
import { Labeled } from '../components/Labeled';
import commonStore from '../stores/commonStore';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { checkUpdate, toastWithButton } from '../utils';
import { RestartApp } from '../../wailsjs/go/backend_golang/App';

export const Languages = {
  dev: 'English', // i18n default
  zh: '简体中文',
  ja: '日本語'
};

export type Language = keyof typeof Languages;

export type SettingsType = {
  language: Language
  darkMode: boolean
  autoUpdatesCheck: boolean
  giteeUpdatesSource: boolean
  cnMirror: boolean
  host: string
  dpiScaling: number
  customModelsPath: string
  customPythonPath: string
  apiUrl: string
  apiKey: string
  apiChatModelName: string
  apiCompletionModelName: string
}

export const Settings: FC = observer(() => {
  const { t, i18n } = useTranslation();
  const advancedHeaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (advancedHeaderRef.current)
      (advancedHeaderRef.current.firstElementChild as HTMLElement).style.padding = '0';
  }, []);

  return (
    <Page title={t('Settings')} content={
      <div className="flex flex-col gap-2 overflow-y-auto overflow-x-hidden p-1">
        <Labeled label={t('Language')} flex spaceBetween content={
          <Dropdown style={{ minWidth: 0 }} listbox={{ style: { minWidth: 0 } }}
            value={Languages[commonStore.settings.language]}
            selectedOptions={[commonStore.settings.language]}
            onOptionSelect={(_, data) => {
              if (data.optionValue) {
                const lang = data.optionValue as Language;
                commonStore.setSettings({
                  language: lang
                });
              }
            }}>
            {
              Object.entries(Languages).map(([langKey, desc]) =>
                <Option key={langKey} value={langKey}>{desc}</Option>)
            }
          </Dropdown>
        } />
        {
          commonStore.platform === 'windows' &&
          <Labeled label={t('DPI Scaling')} flex spaceBetween content={
            <Dropdown style={{ minWidth: 0 }} listbox={{ style: { minWidth: 0 } }}
              value={commonStore.settings.dpiScaling + '%'}
              selectedOptions={[commonStore.settings.dpiScaling.toString()]}
              onOptionSelect={(_, data) => {
                if (data.optionValue) {
                  commonStore.setSettings({
                    dpiScaling: Number(data.optionValue)
                  });
                  toastWithButton(t('Restart the app to apply DPI Scaling.'), t('Restart'), () => {
                    RestartApp();
                  }, {
                    autoClose: 5000
                  });
                }
              }}>
              {
                Array.from({ length: 7 }, (_, i) => (i + 2) * 25).map((v, i) =>
                  <Option key={i} value={v.toString()}>{v + '%'}</Option>)
              }
            </Dropdown>
          } />
        }
        <Labeled label={t('Dark Mode')} flex spaceBetween content={
          <Switch checked={commonStore.settings.darkMode}
            onChange={(e, data) => {
              commonStore.setSettings({
                darkMode: data.checked
              });
            }} />
        } />
        <Labeled label={t('Automatic Updates Check')} flex spaceBetween content={
          <Switch checked={commonStore.settings.autoUpdatesCheck}
            onChange={(e, data) => {
              commonStore.setSettings({
                autoUpdatesCheck: data.checked
              });
              if (data.checked)
                checkUpdate(true);
            }} />
        } />
        {
          commonStore.settings.language === 'zh' &&
          <Labeled label={t('Use Gitee Updates Source')} flex spaceBetween content={
            <Switch checked={commonStore.settings.giteeUpdatesSource}
              onChange={(e, data) => {
                commonStore.setSettings({
                  giteeUpdatesSource: data.checked
                });
              }} />
          } />
        }
        {
          commonStore.settings.language === 'zh' && commonStore.platform !== 'linux' &&
          <Labeled label={t('Use Tsinghua Pip Mirrors')} flex spaceBetween content={
            <Switch checked={commonStore.settings.cnMirror}
              onChange={(e, data) => {
                commonStore.setSettings({
                  cnMirror: data.checked
                });
              }} />
          } />
        }
        <Labeled label={t('Allow external access to the API (service must be restarted)')} flex spaceBetween content={
          <Switch checked={commonStore.settings.host !== '127.0.0.1'}
            onChange={(e, data) => {
              commonStore.setSettings({
                host: data.checked ? '0.0.0.0' : '127.0.0.1'
              });
            }} />
        } />
        <Accordion collapsible openItems={!commonStore.advancedCollapsed && 'advanced'} onToggle={(e, data) => {
          if (data.value === 'advanced')
            commonStore.setAdvancedCollapsed(!commonStore.advancedCollapsed);
        }}>
          <AccordionItem value="advanced">
            <AccordionHeader ref={advancedHeaderRef} size="large">{t('Advanced')}</AccordionHeader>
            <AccordionPanel>
              <div className="flex flex-col gap-2 overflow-hidden">
                {commonStore.platform !== 'darwin' &&
                  <Labeled label={t('Custom Models Path')}
                    content={
                      <Input className="grow" placeholder="./models" value={commonStore.settings.customModelsPath}
                        onChange={(e, data) => {
                          commonStore.setSettings({
                            customModelsPath: data.value
                          });
                        }} />
                    } />
                }
                <Labeled label={t('Custom Python Path')} // if set, will not use precompiled cuda kernel
                  content={
                    <Input className="grow" placeholder="./py310/python" value={commonStore.settings.customPythonPath}
                      onChange={(e, data) => {
                        commonStore.setDepComplete(false);
                        commonStore.setSettings({
                          customPythonPath: data.value
                        });
                      }} />
                  } />
                <Labeled label={'API URL'}
                  content={
                    <div className="flex gap-2">
                      <Input style={{ minWidth: 0 }} className="grow" value={commonStore.settings.apiUrl}
                        onChange={(e, data) => {
                          commonStore.setSettings({
                            apiUrl: data.value
                          });
                        }} />
                      <Dropdown style={{ minWidth: 0 }} listbox={{ style: { minWidth: 0 } }}
                        value="..." selectedOptions={[]} expandIcon={null}
                        onOptionSelect={(_, data) => {
                          commonStore.setSettings({
                            apiUrl: data.optionValue
                          });
                          if (data.optionText === 'OpenAI') {
                            if (commonStore.settings.apiChatModelName === 'rwkv')
                              commonStore.setSettings({
                                apiChatModelName: 'gpt-3.5-turbo'
                              });
                            if (commonStore.settings.apiCompletionModelName === 'rwkv')
                              commonStore.setSettings({
                                apiCompletionModelName: 'text-davinci-003'
                              });
                          }
                        }}>
                        <Option value="">{t('Localhost')!}</Option>
                        <Option value="https://api.openai.com">OpenAI</Option>
                      </Dropdown>
                    </div>
                  } />
                <Labeled label={'API Key'}
                  content={
                    <Input className="grow" placeholder="sk-" value={commonStore.settings.apiKey}
                      onChange={(e, data) => {
                        commonStore.setSettings({
                          apiKey: data.value
                        });
                      }} />
                  } />
                <Labeled label={t('API Chat Model Name')}
                  content={
                    <div className="flex gap-2">
                      <Input style={{ minWidth: 0 }} className="grow" placeholder="rwkv"
                        value={commonStore.settings.apiChatModelName}
                        onChange={(e, data) => {
                          commonStore.setSettings({
                            apiChatModelName: data.value
                          });
                        }} />
                      <Dropdown style={{ minWidth: 0 }} listbox={{ style: { minWidth: 0 } }}
                        value="..." selectedOptions={[]} expandIcon={null}
                        onOptionSelect={(_, data) => {
                          if (data.optionValue) {
                            commonStore.setSettings({
                              apiChatModelName: data.optionValue
                            });
                          }
                        }}>
                        {
                          ['rwkv', 'gpt-4', 'gpt-4-0613', 'gpt-4-32k', 'gpt-4-32k-0613', 'gpt-3.5-turbo', 'gpt-3.5-turbo-0613', 'gpt-3.5-turbo-16k', 'gpt-3.5-turbo-16k-0613']
                          .map((v, i) =>
                            <Option key={i} value={v}>{v}</Option>
                          )
                        }
                      </Dropdown>
                    </div>
                  } />
                <Labeled label={t('API Completion Model Name')}
                  content={
                    <div className="flex gap-2">
                      <Input style={{ minWidth: 0 }} className="grow" placeholder="rwkv"
                        value={commonStore.settings.apiCompletionModelName}
                        onChange={(e, data) => {
                          commonStore.setSettings({
                            apiCompletionModelName: data.value
                          });
                        }} />
                      <Dropdown style={{ minWidth: 0 }} listbox={{ style: { minWidth: 0 } }}
                        value="..." selectedOptions={[]} expandIcon={null}
                        onOptionSelect={(_, data) => {
                          if (data.optionValue) {
                            commonStore.setSettings({
                              apiCompletionModelName: data.optionValue
                            });
                          }
                        }}>
                        {
                          ['rwkv', 'text-davinci-003', 'text-davinci-002', 'text-curie-001', 'text-babbage-001', 'text-ada-001']
                          .map((v, i) =>
                            <Option key={i} value={v}>{v}</Option>
                          )
                        }
                      </Dropdown>
                    </div>
                  } />
              </div>
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
      </div>
    } />
  );
});
