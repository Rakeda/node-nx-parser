var Int64 = require('int64-native');
var fs = require('fs');
var node = require('./node.js').node;

exports.file = function file(pFilename) {
	this.filename = pFilename;
	var starttime = process.hrtime();
	
	this.fileHandle = fs.openSync(this.filename, 'rs');
	
	this.buffer = this.readFilePartially(0, 4 + ((4 + 8) * 4));
	
	if (this.buffer[0] != 0x50 || this.buffer[1] != 0x4B || this.buffer[2] != 0x47 || this.buffer[3] != 0x34)
		throw 'Unsupported Format.';

	var offset = 4;
	this.header = { };
	this.header.node_count = this.buffer.readUInt32LE(offset); offset += 4;
	this.header.node_offset = this.getInt64(offset); offset += 8;
	
	this.header.string_count = this.buffer.readUInt32LE(offset); offset += 4;
	this.header.string_offset = this.getInt64(offset); offset += 8;
	
	this.header.bitmap_count = this.buffer.readUInt32LE(offset); offset += 4;
	this.header.bitmap_offset = this.getInt64(offset); offset += 8;
	
	this.header.audio_count = this.buffer.readUInt32LE(offset); offset += 4;
	this.header.audio_offset = this.getInt64(offset); offset += 8;
	
	this.mainNode = new node(this, 0);
};


exports.file.prototype = {
	close: function () {
		fs.closeSync(this.fileHandle);
	},
	readFilePartially: function (pStart, pLength) {
		if (pStart instanceof Int64) pStart = pStart.toNumber();
		if (pLength instanceof Int64) pLength = pLength.toNumber();
		
		var buf = new Buffer(pLength);
		buf.fill(0);
		if (pLength == 0) return buf;
		fs.readSync(this.fileHandle, buf, 0, pLength, pStart);
		return buf;
	},
	
	getOffset: function (pFrom, pIndex) {
		return this.getInt64(pFrom + (pIndex * 8));
	},
	
	getInt64: function (pFrom) {
		var buffer = this.readFilePartially(pFrom, 8);
		return new Int64(buffer.readUInt32LE(4), buffer.readUInt32LE(0)).toNumber();
	},
	
	string_count: function () {
		return this.header.string_count;
	},
	bitmap_count: function () {
		return this.header.bitmap_count;
	},
	audio_count: function () {
		return this.header.audio_count;
	},
	node_count: function () {
		return this.header.node_count;
	},
	get_string: function (pIndex) {
		var offset = this.getOffset(this.header.string_offset, pIndex);
		var buffer = this.readFilePartially(offset, 2);
		var length = buffer.readUInt16LE(0);
		
		buffer = this.readFilePartially(offset + 2, length);
		
		return buffer.toString();
	},
	
	GetNodeName: function (pIndex) {
		var nodeOffset = this.header.node_offset + (pIndex * 20);
		var buffer = this.readFilePartially(nodeOffset, 4);
		return this.get_string(buffer.readUInt32LE(0));
	},
	
	// node object functions
	GetName: function () {
		return this.filename;
	},

	Child: function (pName) {
		return this.mainNode.Child(pName);
	},
	
	ChildById: function (pId) {
		return this.mainNode.ChildById(pId);
	},
	
	ForEach: function (pCallback) {
		return this.mainNode.ForEach(pCallback);
	},
	
	GetPath: function (pPath) {
		return this.mainNode.GetPath(pPath);
	}
};