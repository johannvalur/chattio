jest.mock('electron', () => ({
	ipcRenderer: {
		send: jest.fn()
	},
	shell: {
		openExternal: jest.fn()
	}
}));

